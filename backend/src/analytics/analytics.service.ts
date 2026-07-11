import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolve a YYYY-MM period to [start, end) month bounds.
   * Falls back to the current month for missing/invalid input.
   */
  private resolvePeriode(periode?: string): {
    periode: string;
    start: Date;
    end: Date;
  } {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-based
    const m = periode?.match(/^(\d{4})-(\d{1,2})$/);
    if (m) {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10) - 1;
    }
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const normalized = `${year}-${String(month + 1).padStart(2, '0')}`;
    return { periode: normalized, start, end };
  }

  private round(value: number, decimals = 0): number {
    const f = Math.pow(10, decimals);
    return Math.round(value * f) / f;
  }

  /**
   * Résout une plage de mois (debut..fin inclus). Si debut/fin absents ou invalides,
   * retombe sur resolvePeriode(periodeParam) (un seul mois / mois courant).
   * bucket = 'month' dès que la plage couvre au moins 2 mois distincts, sinon 'day'.
   */
  private resolveRange(periodeParam?: string, debut?: string, fin?: string): {
    label: string;
    start: Date;
    end: Date;
    bucket: 'day' | 'month';
  } {
    const md = debut?.match(/^(\d{4})-(\d{1,2})$/);
    const mf = fin?.match(/^(\d{4})-(\d{1,2})$/);
    if (md && mf) {
      let y1 = parseInt(md[1], 10), m1 = parseInt(md[2], 10) - 1;
      let y2 = parseInt(mf[1], 10), m2 = parseInt(mf[2], 10) - 1;
      // Réordonne si l'utilisateur inverse début/fin
      if (y2 < y1 || (y2 === y1 && m2 < m1)) {
        [y1, y2] = [y2, y1];
        [m1, m2] = [m2, m1];
      }
      const start = new Date(y1, m1, 1);
      const end = new Date(y2, m2 + 1, 1);
      const monthsSpan = (y2 - y1) * 12 + (m2 - m1) + 1;
      const fmt = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = monthsSpan <= 1 ? fmt(y1, m1) : `${fmt(y1, m1)} → ${fmt(y2, m2)}`;
      return { label, start, end, bucket: monthsSpan >= 2 ? 'month' : 'day' };
    }
    const { periode, start, end } = this.resolvePeriode(periodeParam);
    return { label: periode, start, end, bucket: 'day' };
  }

  /**
   * Données agrégées pour le rapport graphique du CA sur une période :
   * totaux par nature, évolution jour par jour, répartition par formule, top PDV.
   * Tout est calculé depuis les encaissements réels.
   */
  async getRapportGraphique(periodeParam?: string, debut?: string, fin?: string) {
    const { label: periode, start, end, bucket } = this.resolveRange(periodeParam, debut, fin);
    const period = { gte: start, lt: end };
    // Période précédente de même durée (pour la comparaison / tendances).
    const dureeMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - dureeMs);
    const prevPeriod = { gte: prevStart, lt: start };

    const [byNature, rows, byFormuleG, byPdvG, byNaturePrev] = await Promise.all([
      this.prisma.encaissement.groupBy({
        by: ['nature'], where: { date: period }, _sum: { montantTotal: true }, _count: { _all: true },
      }),
      this.prisma.encaissement.findMany({
        where: { date: period }, select: { date: true, nature: true, montantTotal: true },
      }),
      this.prisma.encaissement.groupBy({
        by: ['formuleId'], where: { date: period }, _sum: { montantTotal: true }, _count: { _all: true },
      }),
      this.prisma.encaissement.groupBy({
        by: ['pdvId'], where: { date: period }, _sum: { montantTotal: true }, _count: { _all: true },
      }),
      this.prisma.encaissement.groupBy({
        by: ['nature'], where: { date: prevPeriod }, _sum: { montantTotal: true }, _count: { _all: true },
      }),
    ]);

    const natSum = (n: string) => byNature.find((x) => x.nature === n)?._sum.montantTotal || 0;
    const natNb = (n: string) => byNature.find((x) => x.nature === n)?._count._all || 0;
    const caRecru = natSum('RECRUTEMENT');
    const caReabo = natSum('REABONNEMENT');
    const caMigration = natSum('MIGRATION');
    const caImpaye = natSum('IMPAYE');
    const caTotal = byNature.reduce((s, x) => s + (x._sum.montantTotal || 0), 0);
    const nbOps = byNature.reduce((s, x) => s + (x._count._all || 0), 0);

    // Totaux période précédente + variations (%).
    const prevSum = (n: string) => byNaturePrev.find((x) => x.nature === n)?._sum.montantTotal || 0;
    const prevCaTotal = byNaturePrev.reduce((s, x) => s + (x._sum.montantTotal || 0), 0);
    const prevNbOps = byNaturePrev.reduce((s, x) => s + (x._count._all || 0), 0);
    const variation = (cur: number, prev: number): number | null =>
      prev <= 0 ? null : Math.round(((cur - prev) / prev) * 100);
    const deltas = {
      caTotal: variation(caTotal, prevCaTotal),
      caRecru: variation(caRecru, prevSum('RECRUTEMENT')),
      caReabo: variation(caReabo, prevSum('REABONNEMENT')),
      nbOps: variation(nbOps, prevNbOps),
    };

    // Évolution (recrutement vs réabonnement) — regroupée par jour ou par mois selon la plage
    const dayMap = new Map<string, { recru: number; reabo: number; total: number }>();
    for (const r of rows) {
      const d = new Date(r.date);
      const key = bucket === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dayMap.has(key)) dayMap.set(key, { recru: 0, reabo: 0, total: 0 });
      const e = dayMap.get(key)!;
      e.total += r.montantTotal;
      if (r.nature === 'RECRUTEMENT') e.recru += r.montantTotal;
      else if (r.nature === 'REABONNEMENT') e.reabo += r.montantTotal;
    }
    const byDay = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, recru: this.round(v.recru), reabo: this.round(v.reabo), total: this.round(v.total) }));

    // Répartition par formule
    const formuleIds = byFormuleG.map((g) => g.formuleId);
    const formules = await this.prisma.formule.findMany({ where: { id: { in: formuleIds } }, select: { id: true, code: true, nomCommercial: true } });
    const fMap = new Map(formules.map((f) => [f.id, f]));
    const byFormule = byFormuleG
      .map((g) => ({ formule: fMap.get(g.formuleId)?.nomCommercial || fMap.get(g.formuleId)?.code || '—', montant: this.round(g._sum.montantTotal || 0), nb: g._count._all }))
      .filter((x) => x.montant > 0)
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 8);

    // Top PDV
    const pdvIds = byPdvG.map((g) => g.pdvId);
    const pdvs = await this.prisma.pDV.findMany({ where: { id: { in: pdvIds } }, select: { id: true, raisonSociale: true } });
    const pMap = new Map(pdvs.map((p) => [p.id, p.raisonSociale]));
    const byPdv = byPdvG
      .map((g) => ({ pdv: pMap.get(g.pdvId) || '—', montant: this.round(g._sum.montantTotal || 0), nb: g._count._all }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 10);

    return {
      periode,
      bucket,
      totaux: { caTotal, caRecru, caReabo, caMigration, caImpaye, nbOps, nbRecru: natNb('RECRUTEMENT'), nbReabo: natNb('REABONNEMENT') },
      deltas,
      byDay, byFormule, byPdv,
    };
  }

  /**
   * CA per PDV for the period, split by nature (recrutement / reabonnement).
   * groupBy(pdvId, nature) merged with PDV + secteur names.
   */
  async getCaPdv(periodeParam?: string) {
    const { start, end } = this.resolvePeriode(periodeParam);

    const grouped = await this.prisma.encaissement.groupBy({
      by: ['pdvId', 'nature'],
      where: { date: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { montantTotal: true },
    });

    const pdvIds = [...new Set(grouped.map((g) => g.pdvId))];
    const pdvs = await this.prisma.pDV.findMany({
      where: { id: { in: pdvIds } },
      select: {
        id: true,
        code: true,
        raisonSociale: true,
        secteur: { select: { nom: true } },
      },
    });
    const pdvMap = new Map(pdvs.map((p) => [p.id, p]));

    interface Row {
      nbOps: number;
      caRecru: number;
      caReabo: number;
      caTotal: number;
    }
    const aggByPdv = new Map<string, Row>();
    const ensure = (pdvId: string): Row => {
      let r = aggByPdv.get(pdvId);
      if (!r) {
        r = { nbOps: 0, caRecru: 0, caReabo: 0, caTotal: 0 };
        aggByPdv.set(pdvId, r);
      }
      return r;
    };
    for (const g of grouped) {
      const r = ensure(g.pdvId);
      const count = g._count?._all || 0;
      const montant = g._sum?.montantTotal || 0;
      r.nbOps += count;
      r.caTotal += montant;
      if (g.nature === ('RECRUTEMENT' as any)) r.caRecru += montant;
      else if (g.nature === ('REABONNEMENT' as any)) r.caReabo += montant;
    }

    const result = pdvIds
      .map((pdvId) => {
        const r = aggByPdv.get(pdvId)!;
        const pdv = pdvMap.get(pdvId);
        return {
          pdv: {
            code: pdv?.code ?? '',
            raisonSociale: pdv?.raisonSociale ?? '',
          },
          secteur: pdv?.secteur?.nom ?? '',
          nbOps: r.nbOps,
          caRecru: r.caRecru,
          caReabo: r.caReabo,
          caTotal: r.caTotal,
        };
      })
      .sort((a, b) => b.caTotal - a.caTotal);

    return result;
  }

  /**
   * Ranked PDV listing by caTotal desc with 1-based rang.
   */
  async getClassementPdv(periodeParam?: string) {
    const caPdv = await this.getCaPdv(periodeParam);
    return caPdv.map((row, index) => ({
      rang: index + 1,
      pdv: row.pdv,
      secteur: row.secteur,
      caTotal: row.caTotal,
      nbOps: row.nbOps,
    }));
  }

  /**
   * CA per formule for the period with share of total CA.
   */
  async getCaFormule(periodeParam?: string) {
    const { start, end } = this.resolvePeriode(periodeParam);

    const grouped = await this.prisma.encaissement.groupBy({
      by: ['formuleId'],
      where: { date: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { montantTotal: true },
    });

    const formuleIds = grouped.map((g) => g.formuleId);
    const formules = await this.prisma.formule.findMany({
      where: { id: { in: formuleIds } },
      select: { id: true, code: true, nomCommercial: true },
    });
    const formuleMap = new Map(formules.map((f) => [f.id, f]));

    const totalCA = grouped.reduce(
      (s, g) => s + (g._sum?.montantTotal || 0),
      0,
    );

    const result = grouped
      .map((g) => {
        const f = formuleMap.get(g.formuleId);
        const ca = g._sum?.montantTotal || 0;
        return {
          formule: {
            code: f?.code ?? '',
            nomCommercial: f?.nomCommercial ?? '',
          },
          nb: g._count?._all || 0,
          ca,
          part: totalCA > 0 ? this.round((ca / totalCA) * 100, 1) : 0,
        };
      })
      .sort((a, b) => b.ca - a.ca);

    return result;
  }

  /**
   * Recruitment / reabonnement stats per user for the period.
   * groupBy(userId, nature) merged with user names.
   */
  async getRecrutementUser(periodeParam?: string) {
    const { start, end } = this.resolvePeriode(periodeParam);

    const grouped = await this.prisma.encaissement.groupBy({
      by: ['userId', 'nature'],
      where: { date: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { montantTotal: true },
    });

    const userIds = [...new Set(grouped.map((g) => g.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, prenom: true, nom: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    interface Row {
      nbRecru: number;
      caRecru: number;
      nbReabo: number;
      total: number;
    }
    const aggByUser = new Map<string, Row>();
    const ensure = (userId: string): Row => {
      let r = aggByUser.get(userId);
      if (!r) {
        r = { nbRecru: 0, caRecru: 0, nbReabo: 0, total: 0 };
        aggByUser.set(userId, r);
      }
      return r;
    };
    for (const g of grouped) {
      const r = ensure(g.userId);
      const count = g._count?._all || 0;
      const montant = g._sum?.montantTotal || 0;
      r.total += montant;
      if (g.nature === ('RECRUTEMENT' as any)) {
        r.nbRecru += count;
        r.caRecru += montant;
      } else if (g.nature === ('REABONNEMENT' as any)) {
        r.nbReabo += count;
      }
    }

    const result = userIds
      .map((userId) => {
        const r = aggByUser.get(userId)!;
        const u = userMap.get(userId);
        return {
          user: { prenom: u?.prenom ?? '', nom: u?.nom ?? '' },
          nbRecru: r.nbRecru,
          caRecru: r.caRecru,
          nbReabo: r.nbReabo,
          total: r.total,
        };
      })
      .sort((a, b) => b.total - a.total);

    return result;
  }

  /**
   * ARPU per PDV: period CA divided by active subscribers count.
   */
  async getArpu(periodeParam?: string) {
    const { start, end } = this.resolvePeriode(periodeParam);

    const [grouped, abonnesGrouped] = await Promise.all([
      this.prisma.encaissement.groupBy({
        by: ['pdvId'],
        where: { date: { gte: start, lt: end } },
        _sum: { montantTotal: true },
      }),
      this.prisma.abonne.groupBy({
        by: ['pdvId'],
        where: { statut: 'ACTIF' as any },
        _count: { _all: true },
      }),
    ]);

    const pdvIds = [...new Set(grouped.map((g) => g.pdvId))];
    const pdvs = await this.prisma.pDV.findMany({
      where: { id: { in: pdvIds } },
      select: { id: true, raisonSociale: true },
    });
    const pdvMap = new Map(pdvs.map((p) => [p.id, p]));
    const abonnesMap = new Map(
      abonnesGrouped.map((a) => [a.pdvId, a._count?._all || 0]),
    );

    const result = grouped
      .map((g) => {
        const pdv = pdvMap.get(g.pdvId);
        const caTotal = g._sum?.montantTotal || 0;
        const abonnesActifs = abonnesMap.get(g.pdvId) || 0;
        return {
          pdv: { raisonSociale: pdv?.raisonSociale ?? '' },
          caTotal,
          abonnesActifs,
          arpu: this.round(caTotal / Math.max(abonnesActifs, 1)),
        };
      })
      .sort((a, b) => b.arpu - a.arpu);

    return result;
  }

  /**
   * Sold decodeurs (statut VENDU) grouped by type.
   */
  async getMaterielsVendus() {
    const grouped = await this.prisma.decodeur.groupBy({
      by: ['type'],
      where: { statut: 'VENDU' as any },
      _count: { _all: true },
    });

    const parType = grouped.map((g) => ({
      type: g.type,
      nb: g._count?._all || 0,
    }));
    const total = parType.reduce((s, t) => s + t.nb, 0);

    return { parType, total };
  }

  /**
   * Audit log listing, most recent first.
   */
  async getAuditLog(limit = 200) {
    const logs = await this.prisma.auditLog.findMany({
      include: { user: { select: { prenom: true, nom: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      action: l.action,
      module: l.module,
      ip: l.ip,
      user: {
        prenom: l.user.prenom,
        nom: l.user.nom,
        role: l.user.role,
      },
    }));
  }

  /** Réabonnements réglés via mobile money (Wave / Orange Money). */
  async getReaboMomo() {
    const rows = await this.prisma.encaissement.findMany({
      where: {
        nature: 'REABONNEMENT' as any,
        modePaiement: { in: ['WAVE', 'ORANGE_MONEY'] as any },
      },
      include: {
        abonne: { select: { numAbonne: true, nom: true, prenom: true } },
        formule: { select: { nomCommercial: true } },
        pdv: { select: { raisonSociale: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      numAbonne: r.abonne?.numAbonne ?? '—',
      client: [r.abonne?.prenom, r.abonne?.nom].filter(Boolean).join(' ') || '—',
      formule: r.formule?.nomCommercial ?? '—',
      pdv: r.pdv?.raisonSociale ?? '—',
      montant: r.montantTotal,
      canal: r.modePaiement,
    }));
  }

  /** Global subscriber database. */
  async getBddGlobale(params: {
    q?: string;
    statut?: string;
    formuleId?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    const page = Math.max(1, Math.floor(params.page || 1));
    const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize || 50)));
    const q = (params.q || '').trim();

    const where: Record<string, unknown> = {};
    if (params.statut) where.statut = params.statut;
    if (params.formuleId) where.formuleId = params.formuleId;
    if (q) {
      // Recherche multi-champs (LIKE, insensible à la casse ASCII sous SQLite).
      where.OR = [
        { numAbonne: { contains: q } },
        { nom: { contains: q } },
        { prenom: { contains: q } },
        { tel1: { contains: q } },
        { tel2: { contains: q } },
        { pdv: { raisonSociale: { contains: q } } },
        { formule: { nomCommercial: { contains: q } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.abonne.count({ where }),
      this.prisma.abonne.findMany({
        where,
        include: {
          formule: { select: { nomCommercial: true } },
          pdv: { select: { raisonSociale: true } },
        },
        orderBy: { nom: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      rows: rows.map((a) => ({
        id: a.id,
        numAbonne: a.numAbonne,
        client: [a.prenom, a.nom].filter(Boolean).join(' '),
        tel1: a.tel1,
        formule: a.formule?.nomCommercial ?? '—',
        pdv: a.pdv?.raisonSociale ?? '—',
        statut: a.statut,
        dateEcheance: a.dateEcheance,
      })),
      total,
      page,
      pageSize,
    };
  }
}
