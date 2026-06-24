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
}
