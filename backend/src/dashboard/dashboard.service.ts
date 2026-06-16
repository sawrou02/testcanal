import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

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
}
