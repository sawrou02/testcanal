import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsService, normaliserNumero } from '../sms/sms.service';

/** Message de relance par défaut, personnalisé avec le nom de l'abonné. */
export function messageRelance(a: { prenom?: string; nom?: string; dateEcheance?: Date | string }): string {
  const nom = `${a.prenom || ''} ${a.nom || ''}`.trim();
  let ech = '';
  if (a.dateEcheance) {
    const d = new Date(a.dateEcheance);
    ech = ` (échéance le ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()})`;
  }
  return `Bonjour ${nom}, votre abonnement arrive à échéance${ech}. Pensez à le renouveler pour éviter toute coupure. Merci.`;
}

/**
 * Shared include used across most list endpoints. Keeps the formule/pdv
 * projection consistent with the rest of the codebase (see abonnes.service).
 */
const FORMULE_PDV_INCLUDE = {
  formule: { select: { code: true, nomCommercial: true } },
  pdv: { select: { raisonSociale: true } },
};

/** Add `n` days to a date, returning a new Date. */
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class ServiceAbonnementService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private sms: SmsService,
  ) {}

  /**
   * Aggregate counters + two derived KPIs (ARPU, taux de réabonnement).
   * All numbers come straight from DB counts/sums; the only modelling choices
   * are documented inline.
   */
  async getStats() {
    const now = new Date();
    const in30 = addDays(now, 30);

    const [
      total,
      actifs,
      echus,
      suspendus,
      resilies,
      aae30,
      sumAgg,
      reaboCount,
    ] = await Promise.all([
      this.prisma.abonne.count(),
      this.prisma.abonne.count({ where: { statut: 'ACTIF' as any } }),
      this.prisma.abonne.count({ where: { statut: 'ECHU' as any } }),
      this.prisma.abonne.count({ where: { statut: 'SUSPENDU' as any } }),
      this.prisma.abonne.count({ where: { statut: 'RESILIE' as any } }),
      this.prisma.abonne.count({
        where: {
          statut: 'ACTIF' as any,
          dateEcheance: { gte: now, lte: in30 },
        },
      }),
      this.prisma.encaissement.aggregate({ _sum: { montantTotal: true } }),
      // Réabonnement proxy: an abonné counts as "réabonné" when canalReabo is set.
      this.prisma.abonne.count({ where: { canalReabo: { not: null } } }),
    ]);

    const caTotal = sumAgg._sum.montantTotal || 0;
    // ARPU = CA total encaissé / nombre d'abonnés actifs (guard against /0).
    const arpu = Math.round(caTotal / Math.max(actifs, 1));
    // Taux de réabonnement = part des abonnés ayant un canalReabo renseigné.
    const tauxReabo = Math.round((reaboCount / Math.max(total, 1)) * 100);

    return {
      total,
      actifs,
      echus,
      suspendus,
      resilies,
      aae30,
      arpu,
      tauxReabo,
    };
  }

  /**
   * Taux RPE (Retour à Plein Encaissement) par PDV : part des abonnés qui se
   * réabonnent (mois courant) parmi ceux qui devaient renouveler (réabonnés +
   * échus actuels). Tout est calculé depuis la base, aucune valeur inventée.
   */
  async getTauxRpe() {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [pdvs, echusByPdv, reabos] = await Promise.all([
      this.prisma.pDV.findMany({
        select: { id: true, code: true, raisonSociale: true },
        orderBy: { raisonSociale: 'asc' },
      }),
      this.prisma.abonne.groupBy({
        by: ['pdvId'],
        where: { statut: 'ECHU' as any },
        _count: { _all: true },
      }),
      this.prisma.encaissement.findMany({
        where: { nature: 'REABONNEMENT' as any, date: { gte: mStart, lt: mEnd } },
        select: { pdvId: true, abonneId: true },
      }),
    ]);

    const echusMap = new Map(echusByPdv.map((e) => [e.pdvId, e._count._all]));
    const reaboSet = new Map<string, Set<string>>();
    for (const r of reabos) {
      if (!reaboSet.has(r.pdvId)) reaboSet.set(r.pdvId, new Set());
      reaboSet.get(r.pdvId)!.add(r.abonneId);
    }

    const rows = pdvs
      .map((p) => {
        const nbEchus = echusMap.get(p.id) || 0;
        const nbReabo = reaboSet.get(p.id)?.size || 0;
        const base = nbReabo + nbEchus;
        const taux = base > 0 ? Math.round((nbReabo / base) * 1000) / 10 : 0;
        return { pdv: { code: p.code, raisonSociale: p.raisonSociale }, nbEchus, nbReabo, taux };
      })
      .filter((r) => r.nbEchus > 0 || r.nbReabo > 0);

    const totEchus = rows.reduce((s, r) => s + r.nbEchus, 0);
    const totReabo = rows.reduce((s, r) => s + r.nbReabo, 0);
    const totBase = totEchus + totReabo;
    return {
      rows,
      totaux: {
        nbEchus: totEchus,
        nbReabo: totReabo,
        taux: totBase > 0 ? Math.round((totReabo / totBase) * 1000) / 10 : 0,
      },
    };
  }

  /** Abonnés à échéance (ACTIF) tombant dans la fenêtre [today, today+jours]. */
  async getAae(jours = 30) {
    const now = new Date();
    const limit = addDays(now, jours);

    return this.prisma.abonne.findMany({
      where: {
        statut: 'ACTIF' as any,
        dateEcheance: { gte: now, lte: limit },
      },
      include: FORMULE_PDV_INCLUDE,
      orderBy: { dateEcheance: 'asc' },
    });
  }

  /** Abonnés échus. */
  async getEchus() {
    return this.prisma.abonne.findMany({
      where: { statut: 'ECHU' as any },
      include: FORMULE_PDV_INCLUDE,
      orderBy: { dateEcheance: 'asc' },
    });
  }

  /**
   * Échéancier de relance unifié : abonnés à relancer, des récemment échus
   * jusqu'aux échéances à venir dans `jours` jours.
   *
   * Fenêtre = [aujourd'hui - `passe` jours ; aujourd'hui + `jours` jours].
   * On borne le passé pour ne pas remonter des échus très anciens (clients
   * probablement perdus). Chaque abonné reçoit :
   *  - joursRestants : > 0 à venir, 0 aujourd'hui, < 0 échu depuis N jours
   *  - urgence : 'echu' | 'urgent' (0–7 j) | 'avenir' (8+ j)
   */
  async getRelances(jours = 30, passe = 30) {
    const j = Number.isFinite(jours) && jours > 0 ? Math.min(jours, 365) : 30;
    const p = Number.isFinite(passe) && passe >= 0 ? Math.min(passe, 365) : 30;

    const now = new Date();
    const debut = addDays(now, -p);
    const fin = addDays(now, j);
    // Début de journée pour un calcul de "jours restants" stable.
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const abonnes = await this.prisma.abonne.findMany({
      where: {
        statut: { in: ['ACTIF', 'ECHU'] as any },
        dateEcheance: { gte: debut, lte: fin },
      },
      include: FORMULE_PDV_INCLUDE,
      orderBy: { dateEcheance: 'asc' },
      take: 3000,
    });

    const DAY = 24 * 60 * 60 * 1000;
    let echus = 0;
    let urgent = 0;
    let avenir = 0;
    const items = abonnes.map((a) => {
      const ech = new Date(a.dateEcheance);
      const echDay = new Date(ech.getFullYear(), ech.getMonth(), ech.getDate());
      const joursRestants = Math.round((echDay.getTime() - today.getTime()) / DAY);
      let urgence: 'echu' | 'urgent' | 'avenir';
      if (joursRestants < 0) {
        urgence = 'echu';
        echus++;
      } else if (joursRestants <= 7) {
        urgence = 'urgent';
        urgent++;
      } else {
        urgence = 'avenir';
        avenir++;
      }
      return { ...a, joursRestants, urgence };
    });

    return {
      jours: j,
      passe: p,
      counts: { echus, urgent, avenir, total: items.length },
      items,
    };
  }

  /**
   * Fiches non qualifiées (heuristique = dossier incomplet) :
   * décodeur non attribué OU téléphone principal vide.
   */
  async getNonQualifies() {
    const rows = await this.prisma.abonne.findMany({
      where: {
        OR: [{ decodeurId: null }, { tel1: '' }],
      },
      include: FORMULE_PDV_INCLUDE,
    });

    return rows.map((a) => ({
      ...a,
      motif:
        a.decodeurId === null
          ? 'Décodeur non attribué'
          : 'Téléphone manquant',
    }));
  }

  /**
   * Suivi M+ des abonnés actifs. `niveau` = 'M+' + nombre de mois (arrondi au
   * supérieur) avant échéance, borné dans [1, 6].
   */
  /**
   * Suivi M+ (cohorte de réabonnement) : pour un mois de recrutement et un
   * niveau M+N, mesure le réabonnement par date de recrutement, avec le taux
   * de conversion et la répartition par canal (Réseau / Mobile Money).
   */
  async getSuiviMp(mois?: number, annee?: number, type = 'M+1', pdvId?: string) {
    const now = new Date()
    const m = mois && mois >= 1 && mois <= 12 ? mois - 1 : now.getMonth()
    const y = annee && annee > 2000 ? annee : now.getFullYear()
    const start = new Date(y, m, 1)
    const end = new Date(y, m + 1, 1)

    // Recrutements du mois choisi (option: filtré par PDV)
    const recruits = await this.prisma.encaissement.findMany({
      where: { nature: 'RECRUTEMENT' as any, date: { gte: start, lt: end }, ...(pdvId ? { pdvId } : {}) },
      select: { abonneId: true, date: true },
    })

    const N = type === 'M+3' ? 3 : type === 'M+2' ? 2 : 1
    const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    // Cohortes par jour de recrutement
    const cohorts = new Map<string, { date: Date; abonnes: Set<string> }>()
    for (const r of recruits) {
      const k = dayKey(new Date(r.date))
      if (!cohorts.has(k)) cohorts.set(k, { date: new Date(r.date), abonnes: new Set() })
      cohorts.get(k)!.abonnes.add(r.abonneId)
    }

    // Réabonnements de ces abonnés (canal via mode de paiement)
    const allIds = recruits.map((r) => r.abonneId)
    const reabos = allIds.length
      ? await this.prisma.encaissement.findMany({
          where: { nature: 'REABONNEMENT' as any, abonneId: { in: allIds } },
          select: { abonneId: true, modePaiement: true },
        })
      : []
    const reaboMode = new Map<string, string>()
    for (const r of reabos) if (!reaboMode.has(r.abonneId)) reaboMode.set(r.abonneId, r.modePaiement as any)

    const rows = Array.from(cohorts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, c]) => {
        const ech = new Date(c.date); ech.setMonth(ech.getMonth() + N)
        let realise = 0, reseau = 0, mobileMoney = 0
        for (const id of c.abonnes) {
          const mode = reaboMode.get(id)
          if (!mode) continue
          realise++
          if (mode === 'WAVE' || mode === 'ORANGE_MONEY') mobileMoney++
          else reseau++
        }
        const nbreRecrut = c.abonnes.size
        return {
          date: k,
          echeance: dayKey(ech),
          nbreRecrut,
          realise,
          taux: nbreRecrut ? Math.round((realise / nbreRecrut) * 1000) / 10 : 0,
          reseau,
          mobileMoney,
          reste: nbreRecrut - realise,
        }
      })

    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0)
    const totRecrut = sum((r) => r.nbreRecrut)
    const totRealise = sum((r) => r.realise)
    return {
      periode: `${String(m + 1).padStart(2, '0')}/${y}`,
      type,
      rows,
      totaux: {
        nbreRecrut: totRecrut,
        realise: totRealise,
        reseau: sum((r) => r.reseau),
        mobileMoney: sum((r) => r.mobileMoney),
        reste: sum((r) => r.reste),
        taux: totRecrut ? Math.round((totRealise / totRecrut) * 1000) / 10 : 0,
      },
    }
  }

  /**
   * Abonnés ayant au moins un encaissement de nature RECRUTEMENT, enrichis
   * de `dateRecrutement` = date du dernier RECRUTEMENT, triés desc.
   */
  async getBienvenue() {
    const recent = await this.prisma.encaissement.findMany({
      where: { nature: 'RECRUTEMENT' as any },
      select: { abonneId: true, date: true },
      orderBy: { date: 'desc' },
      take: 500,
    });

    if (recent.length === 0) {
      return [];
    }

    // Latest RECRUTEMENT date per abonné (recent[] already sorted desc).
    const latestByAbonne = new Map<string, Date>();
    for (const e of recent) {
      if (!latestByAbonne.has(e.abonneId)) {
        latestByAbonne.set(e.abonneId, e.date);
      }
    }

    const abonneIds = [...latestByAbonne.keys()];
    const abonnes = await this.prisma.abonne.findMany({
      where: { id: { in: abonneIds } },
      include: FORMULE_PDV_INCLUDE,
    });

    return abonnes
      .map((a) => ({
        ...a,
        dateRecrutement: latestByAbonne.get(a.id) as Date,
      }))
      .sort(
        (x, y) => y.dateRecrutement.getTime() - x.dateRecrutement.getTime(),
      );
  }

  /** Derniers encaissements de recrutement. */
  async getRecrutement() {
    return this.prisma.encaissement.findMany({
      where: { nature: 'RECRUTEMENT' as any },
      include: {
        abonne: { select: { numAbonne: true, nom: true, prenom: true } },
        pdv: { select: { raisonSociale: true } },
        formule: { select: { code: true, nomCommercial: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  /** Mock SMS dispatch (no real gateway). Audit-logged. */
  async sendSms(dto: SendSmsDto, userId: string, ip: string) {
    if (!dto.abonneIds || dto.abonneIds.length === 0) {
      throw new BadRequestException('Aucun abonné sélectionné');
    }

    await this.audit.log(userId, 'ENVOI_SMS', 'SERVICE_ABONNEMENT', ip);

    const abonnes = await this.prisma.abonne.findMany({
      where: { id: { in: dto.abonneIds } },
      select: { prenom: true, nom: true, tel1: true, dateEcheance: true },
    });
    const perso = dto.message?.trim();
    const messages = abonnes
      .map((a) => ({ to: normaliserNumero(a.tel1), body: perso || messageRelance(a) }))
      .filter((m) => m.to);

    return this.sms.envoyer(messages);
  }
}
