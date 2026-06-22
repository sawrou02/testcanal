import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SendSmsDto } from './dto/send-sms.dto';

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

    return { sent: dto.abonneIds.length };
  }
}
