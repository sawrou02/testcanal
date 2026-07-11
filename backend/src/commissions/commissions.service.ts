import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaremesService } from '../baremes/baremes.service';

interface PdvAggregate {
  nbRecru: number;
  caRecru: number;
  nbReabo: number;
  caReabo: number;
  nbMigration: number;
}

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
    private baremes: BaremesService,
  ) {}

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
    let month = now.getMonth();
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

  /**
   * Commissions par PDV pour une période.
   * Les BARÈMES sont lus depuis la base (table ParametreCommission), jamais
   * codés en dur — l'admin peut les modifier sans redéploiement.
   *
   * Formule (conforme à la spécification métier) :
   *   commission = comm_materielle × NB_recruts
   *              + (comm_formule_abo/100) × CA_recruts
   *              + (comm_reabo/100) × CA_reabo
   *              + comm_g11 × NB_recruts_g11
   */
  async getCommissions(periodeParam?: string) {
    const { periode, start, end } = this.resolvePeriode(periodeParam);
    const bareme = await this.baremes.getMap();

    const [pdvs, grouped, g11Rows] = await Promise.all([
      this.prisma.pDV.findMany({
        select: { id: true, code: true, raisonSociale: true },
        orderBy: { raisonSociale: 'asc' },
      }),
      this.prisma.encaissement.groupBy({
        by: ['pdvId', 'nature'],
        where: { date: { gte: start, lt: end } },
        _count: { _all: true },
        _sum: { montantTotal: true },
      }),
      // Recrutements/migrations dont l'abonné a un décodeur G11.
      this.prisma.encaissement.findMany({
        where: {
          nature: { in: ['RECRUTEMENT', 'MIGRATION'] as any },
          date: { gte: start, lt: end },
          abonne: { decodeur: { type: 'G11' } },
        },
        select: { pdvId: true },
      }),
    ]);

    const aggByPdv = new Map<string, PdvAggregate>();
    const ensure = (pdvId: string): PdvAggregate => {
      let a = aggByPdv.get(pdvId);
      if (!a) {
        a = { nbRecru: 0, caRecru: 0, nbReabo: 0, caReabo: 0, nbMigration: 0 };
        aggByPdv.set(pdvId, a);
      }
      return a;
    };
    for (const g of grouped) {
      const a = ensure(g.pdvId);
      const count = g._count?._all || 0;
      const montant = g._sum?.montantTotal || 0;
      if (g.nature === ('RECRUTEMENT' as any)) {
        a.nbRecru += count;
        a.caRecru += montant;
      } else if (g.nature === ('REABONNEMENT' as any)) {
        a.nbReabo += count;
        a.caReabo += montant;
      } else if (g.nature === ('MIGRATION' as any)) {
        a.nbMigration += count;
      }
    }

    const g11ByPdv = new Map<string, number>();
    for (const r of g11Rows) {
      g11ByPdv.set(r.pdvId, (g11ByPdv.get(r.pdvId) || 0) + 1);
    }

    const tauxFormule = (bareme.comm_formule_abo || 0) / 100;
    const tauxReabo = (bareme.comm_reabo || 0) / 100;
    const fMateriel = bareme.comm_materielle || 0;
    const fG11 = bareme.comm_g11 || 0;

    const lignes = pdvs.map((pdv) => {
      const a = aggByPdv.get(pdv.id) || {
        nbRecru: 0, caRecru: 0, nbReabo: 0, caReabo: 0, nbMigration: 0,
      };
      const nbG11 = g11ByPdv.get(pdv.id) || 0;

      const comMateriel = a.nbRecru * fMateriel;
      const comFormule = a.caRecru * tauxFormule;
      const comReabo = a.caReabo * tauxReabo;
      const comG11 = nbG11 * fG11;
      const comNette = comMateriel + comFormule + comReabo + comG11;

      return {
        pdv: { code: pdv.code, raisonSociale: pdv.raisonSociale },
        nbRecru: a.nbRecru,
        caRecru: a.caRecru,
        nbReabo: a.nbReabo,
        caReabo: a.caReabo,
        nbMigration: a.nbMigration,
        nbG11,
        comMateriel,
        comFormule,
        comReabo,
        comG11,
        comNette,
      };
    });

    const comNetteTotal = lignes.reduce((s, l) => s + l.comNette, 0);
    const partenaires = lignes.filter((l) => l.comNette > 0).length;

    return {
      periode,
      // Barèmes utilisés pour ce calcul (auditable).
      baremes: {
        comm_materielle: fMateriel,
        comm_formule_abo: bareme.comm_formule_abo || 0,
        comm_reabo: bareme.comm_reabo || 0,
        comm_g11: fG11,
      },
      lignes,
      totaux: { comNette: comNetteTotal, partenaires },
    };
  }

  /**
   * Bordereau de commission détaillé pour UN point de vente et une période :
   * le relevé à remettre au partenaire. Reprend exactement la même formule
   * que getCommissions, mais pour un seul PDV, avec le détail des opérations.
   */
  async getBordereau(pdvId: string, periodeParam?: string) {
    const { periode, start, end } = this.resolvePeriode(periodeParam);
    const bareme = await this.baremes.getMap();

    const pdv = await this.prisma.pDV.findUnique({
      where: { id: pdvId },
      select: { code: true, raisonSociale: true },
    });
    if (!pdv) {
      return null;
    }

    const [grouped, g11Rows, detailRows] = await Promise.all([
      this.prisma.encaissement.groupBy({
        by: ['nature'],
        where: { pdvId, date: { gte: start, lt: end } },
        _count: { _all: true },
        _sum: { montantTotal: true },
      }),
      this.prisma.encaissement.findMany({
        where: {
          pdvId,
          nature: { in: ['RECRUTEMENT', 'MIGRATION'] as any },
          date: { gte: start, lt: end },
          abonne: { decodeur: { type: 'G11' } },
        },
        select: { id: true },
      }),
      this.prisma.encaissement.findMany({
        where: { pdvId, date: { gte: start, lt: end } },
        select: {
          date: true,
          nature: true,
          montantTotal: true,
          abonne: { select: { numAbonne: true, nom: true, prenom: true } },
          formule: { select: { nomCommercial: true } },
        },
        orderBy: { date: 'asc' },
        take: 1000,
      }),
    ]);

    const natSum = (n: string) =>
      grouped.find((g) => g.nature === (n as any))?._sum?.montantTotal || 0;
    const natNb = (n: string) =>
      grouped.find((g) => g.nature === (n as any))?._count?._all || 0;

    const nbRecru = natNb('RECRUTEMENT');
    const caRecru = natSum('RECRUTEMENT');
    const nbReabo = natNb('REABONNEMENT');
    const caReabo = natSum('REABONNEMENT');
    const nbMigration = natNb('MIGRATION');
    const nbG11 = g11Rows.length;

    const tauxFormule = (bareme.comm_formule_abo || 0) / 100;
    const tauxReabo = (bareme.comm_reabo || 0) / 100;
    const fMateriel = bareme.comm_materielle || 0;
    const fG11 = bareme.comm_g11 || 0;

    const comMateriel = nbRecru * fMateriel;
    const comFormule = caRecru * tauxFormule;
    const comReabo = caReabo * tauxReabo;
    const comG11 = nbG11 * fG11;
    const comNette = comMateriel + comFormule + comReabo + comG11;

    // Lignes récapitulatives (base × taux = montant) pour le bordereau.
    const resume = [
      { libelle: 'Recrutement (matériel)', base: nbRecru, uniteBase: 'abonné(s)', taux: fMateriel, uniteTaux: '/abonné', montant: comMateriel },
      { libelle: 'Commission formule', base: caRecru, uniteBase: 'CA recrut.', taux: bareme.comm_formule_abo || 0, uniteTaux: '%', montant: comFormule },
      { libelle: 'Réabonnement', base: caReabo, uniteBase: 'CA réabo.', taux: bareme.comm_reabo || 0, uniteTaux: '%', montant: comReabo },
      { libelle: 'Réseau G11', base: nbG11, uniteBase: 'unité(s)', taux: fG11, uniteTaux: '/unité', montant: comG11 },
    ];

    return {
      periode,
      pdv,
      compteurs: { nbRecru, caRecru, nbReabo, caReabo, nbMigration, nbG11 },
      resume,
      comNette,
      detail: detailRows.map((r) => ({
        date: r.date,
        numAbonne: r.abonne?.numAbonne ?? '—',
        client: [r.abonne?.prenom, r.abonne?.nom].filter(Boolean).join(' ') || '—',
        nature: r.nature,
        formule: r.formule?.nomCommercial ?? '—',
        montant: r.montantTotal,
      })),
      detailTronque: detailRows.length >= 1000,
    };
  }
}
