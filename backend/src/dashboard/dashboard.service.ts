import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaremesService } from '../baremes/baremes.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private baremes: BaremesService,
  ) {}

  /**
   * Suivi des objectifs de recrutement du mois, par PDV et par secteur :
   * objectif (saisi), réalisé (recrutements du mois), R/O et reste. Aucune
   * valeur inventée : si aucun objectif n'est saisi, R/O est à 0.
   */
  async getObjectifsSuivi() {
    const now = new Date();
    const year = now.getFullYear();
    const month1 = now.getMonth() + 1;
    const mStart = new Date(year, now.getMonth(), 1);
    const mEnd = new Date(year, now.getMonth() + 1, 1);

    const [pdvs, objs, recruits, secteurs] = await Promise.all([
      this.prisma.pDV.findMany({ select: { id: true, raisonSociale: true, secteurId: true } }),
      this.prisma.objectifPdv.findMany({ where: { annee: year, mois: month1, typeObjectif: 'RECRUTEMENT' } }),
      this.prisma.encaissement.groupBy({
        by: ['pdvId'],
        where: { nature: 'RECRUTEMENT' as any, date: { gte: mStart, lt: mEnd } },
        _count: { _all: true },
      }),
      this.prisma.secteur.findMany({ select: { id: true, nom: true } }),
    ]);

    const objMap = new Map(objs.map((o) => [o.pdvId, o.effectif]));
    const recMap = new Map(recruits.map((r) => [r.pdvId, r._count._all]));
    const secMap = new Map(secteurs.map((s) => [s.id, s.nom]));
    const ro = (re: number, ob: number) => (ob > 0 ? Math.round((re / ob) * 100) : 0);

    const pdvRows = pdvs
      .map((p) => {
        const objectif = objMap.get(p.id) || 0;
        const realise = recMap.get(p.id) || 0;
        return {
          pdv: p.raisonSociale,
          secteur: secMap.get(p.secteurId) || '—',
          objectif, realise, ro: ro(realise, objectif), reste: Math.max(objectif - realise, 0),
        };
      })
      .filter((r) => r.objectif > 0 || r.realise > 0);

    const bySect = new Map<string, { secteur: string; objectif: number; realise: number }>();
    for (const p of pdvs) {
      const sec = secMap.get(p.secteurId) || '—';
      if (!bySect.has(sec)) bySect.set(sec, { secteur: sec, objectif: 0, realise: 0 });
      const agg = bySect.get(sec)!;
      agg.objectif += objMap.get(p.id) || 0;
      agg.realise += recMap.get(p.id) || 0;
    }
    const secteurRows = Array.from(bySect.values())
      .map((s) => ({ ...s, ro: ro(s.realise, s.objectif), reste: Math.max(s.objectif - s.realise, 0) }))
      .filter((s) => s.objectif > 0 || s.realise > 0);

    return { pdvs: pdvRows, secteurs: secteurRows };
  }

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const dayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    // 30-day window starting at midnight 29 days ago (inclusive of today => 30 days).
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
    );

    const [
      recrutementsCount,
      reaboCount,
      encaisseMois,
      encaisseJour,
      stockDecodeurs,
      versementsEnAttente,
      totalPDVs,
      totalAbonnes,
      last30Encaissements,
      secteurs,
      pdvs,
    ] = await Promise.all([
      this.prisma.encaissement.count({
        where: {
          nature: 'RECRUTEMENT' as any,
          date: { gte: monthStart, lt: monthEnd },
        },
      }),
      this.prisma.encaissement.count({
        where: {
          nature: 'REABONNEMENT' as any,
          date: { gte: monthStart, lt: monthEnd },
        },
      }),
      this.prisma.encaissement.aggregate({
        _sum: { montantTotal: true },
        where: { date: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.encaissement.aggregate({
        _sum: { montantTotal: true },
        where: { date: { gte: dayStart, lt: dayEnd } },
      }),
      this.prisma.decodeur.count({
        where: {
          statut: { in: ['EN_STOCK_ENTREPOT', 'EN_STOCK_PDV'] as any },
        },
      }),
      this.prisma.versement.count({ where: { statut: 'ENATTENTE' as any } }),
      this.prisma.pDV.count(),
      this.prisma.abonne.count(),
      this.prisma.encaissement.findMany({
        where: { date: { gte: windowStart, lt: dayEnd } },
        select: { date: true, nature: true },
      }),
      this.prisma.secteur.findMany({ select: { id: true, nom: true } }),
      this.prisma.pDV.findMany({ select: { id: true, secteurId: true } }),
    ]);

    // activite30j: one bucket per day for the last 30 days, defaulting to 0.
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;

    const buckets = new Map<string, { recrut: number; reabo: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(
        windowStart.getFullYear(),
        windowStart.getMonth(),
        windowStart.getDate() + i,
      );
      buckets.set(dayKey(d), { recrut: 0, reabo: 0 });
    }
    for (const enc of last30Encaissements) {
      const key = dayKey(new Date(enc.date));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (enc.nature === ('RECRUTEMENT' as any)) bucket.recrut += 1;
      else if (enc.nature === ('REABONNEMENT' as any)) bucket.reabo += 1;
    }
    const activite30j = Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      recrut: v.recrut,
      reabo: v.reabo,
    }));

    // soldesParSecteur: sum of encaissement.montantTotal joined encaissement -> pdv -> secteur.
    const pdvSecteur = new Map(pdvs.map((p) => [p.id, p.secteurId]));
    const ventesByPdv = await this.prisma.encaissement.groupBy({
      by: ['pdvId'],
      _sum: { montantTotal: true },
    });
    const ventesBySecteur = new Map<string, number>();
    for (const row of ventesByPdv) {
      const secteurId = pdvSecteur.get(row.pdvId);
      if (!secteurId) continue;
      const current = ventesBySecteur.get(secteurId) || 0;
      ventesBySecteur.set(
        secteurId,
        current + (row._sum.montantTotal || 0),
      );
    }
    const soldesParSecteur = secteurs.map((s) => ({
      secteur: s.nom,
      ventes: ventesBySecteur.get(s.id) || 0,
    }));

    return {
      recrutementsCount,
      reaboCount,
      encaisseDuMois: encaisseMois._sum.montantTotal || 0,
      encaisseDuJour: encaisseJour._sum.montantTotal || 0,
      stockDecodeurs,
      versementsEnAttente,
      totalPDVs,
      totalAbonnes,
      activite30j,
      soldesParSecteur,
    };
  }

  /** Cartes de synthèse (style OGECPRO) : Recouvrement / Vente / Réabonnement / Logistique. */
  /**
   * Résout l'objectif (effectif) pour un type donné sur la période courante,
   * du plus précis au plus large : mois > trimestre > annuel. Retourne 0 si
   * aucun objectif n'est saisi (jamais de valeur inventée).
   */
  private resolveObjectif(
    objs: { annee: number; trimestre: number | null; mois: number | null; typeObjectif: string; effectif: number }[],
    type: string,
    year: number,
    month1: number,
  ): number {
    const trimestre = Math.floor((month1 - 1) / 3) + 1;
    const t = objs.filter((o) => o.typeObjectif === type && o.annee === year);
    const sum = (rows: typeof t) => rows.reduce((s, o) => s + o.effectif, 0);
    const monthly = t.filter((o) => o.mois === month1);
    if (monthly.length) return sum(monthly);
    const quarterly = t.filter((o) => o.mois == null && o.trimestre === trimestre);
    if (quarterly.length) return sum(quarterly);
    const annual = t.filter((o) => o.mois == null && o.trimestre == null);
    return sum(annual);
  }

  async getSynthese() {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const period = { gte: mStart, lt: mEnd };

    const [
      creditAgg, nbRecru, caRecruAgg, nbReabo, caReaboAgg, nbMigration,
      parcActif, echus, decsByTypeStatut, bareme, objs,
    ] = await Promise.all([
      this.prisma.credit.aggregate({ _sum: { plafond: true, avoir: true, dette: true } }),
      this.prisma.encaissement.count({ where: { nature: 'RECRUTEMENT' as any, date: period } }),
      this.prisma.encaissement.aggregate({ _sum: { montantTotal: true }, where: { nature: 'RECRUTEMENT' as any, date: period } }),
      this.prisma.encaissement.count({ where: { nature: 'REABONNEMENT' as any, date: period } }),
      this.prisma.encaissement.aggregate({ _sum: { montantTotal: true }, where: { nature: 'REABONNEMENT' as any, date: period } }),
      this.prisma.encaissement.count({ where: { nature: 'MIGRATION' as any, date: period } }),
      this.prisma.abonne.count({ where: { statut: 'ACTIF' as any } }),
      this.prisma.abonne.count({ where: { statut: 'ECHU' as any } }),
      this.prisma.decodeur.groupBy({ by: ['type', 'statut'], _count: { _all: true } }),
      this.baremes.getMap(),
      this.prisma.objectifDistributeur.findMany(),
    ]);

    const dec = (type: string, statut: string) =>
      decsByTypeStatut.find((d) => d.type === (type as any) && d.statut === (statut as any))?._count._all || 0;

    const caRecru = caRecruAgg._sum.montantTotal || 0;
    const caReabo = caReaboAgg._sum.montantTotal || 0;

    // ----- Objectifs (R/O, reste, atterrissage) -----
    const year = now.getFullYear();
    const month1 = now.getMonth() + 1;
    const objRecru = this.resolveObjectif(objs as any, 'RECRUTEMENT', year, month1);
    const objReabo = this.resolveObjectif(objs as any, 'REABONNEMENT', year, month1);
    // Atterrissage = projection linéaire de fin de mois (run-rate). Ce n'est pas
    // une donnée inventée : c'est le réalisé rapporté au rythme du mois.
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month1, 0).getDate();
    const elapsed = Math.max(dayOfMonth / daysInMonth, 1 / daysInMonth);
    const ro = (real: number, obj: number) => (obj > 0 ? Math.round((real / obj) * 100) : 0);
    const reste = (real: number, obj: number) => Math.max(obj - real, 0);
    const atterr = (real: number, obj: number) =>
      obj > 0 ? Math.round((real / elapsed / obj) * 100) : 0;

    return {
      recouvrement: {
        creditRestant: (creditAgg._sum.plafond || 0) + (creditAgg._sum.avoir || 0) - (creditAgg._sum.dette || 0),
        avoir: creditAgg._sum.avoir || 0,
        encours: creditAgg._sum.dette || 0,
        commMateriel: Math.round(nbRecru * (bareme.comm_materielle || 0)),
        commFormule: Math.round(caRecru * ((bareme.comm_formule_abo || 0) / 100)),
        commReabo: Math.round(caReabo * ((bareme.comm_reabo || 0) / 100)),
      },
      vente: {
        nbAbo: nbRecru, caRecru, nbMigration, rapport: now.toISOString().slice(0, 10),
        objectif: objRecru, ro: ro(nbRecru, objRecru), reste: reste(nbRecru, objRecru), atterrissage: atterr(nbRecru, objRecru),
      },
      reabo: {
        parcActif, nbReabo, caReabo, echus,
        objectif: objReabo, ro: ro(nbReabo, objReabo), reste: reste(nbReabo, objReabo), atterrissage: atterr(nbReabo, objReabo),
      },
      logistique: {
        z4Stock: dec('Z4', 'EN_STOCK_ENTREPOT'),
        z4Reseau: dec('Z4', 'EN_STOCK_PDV'),
        z4Defectueux: dec('Z4', 'DEFECTUEUX'),
        globazStock: dec('GLOBAZ', 'EN_STOCK_ENTREPOT'),
        globazReseau: dec('GLOBAZ', 'EN_STOCK_PDV'),
        g11Stock: dec('G11', 'EN_STOCK_ENTREPOT'),
        g11Reseau: dec('G11', 'EN_STOCK_PDV'),
      },
    };
  }
}
