import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalAbonnes, totalPDVs, totalEncaissements, versementsEnAttente] = await Promise.all([
      this.prisma.abonne.count(),
      this.prisma.pDV.count(),
      this.prisma.encaissement.aggregate({ _sum: { montantTotal: true } }),
      this.prisma.versement.count({ where: { statut: 'ENATTENTE' } }),
    ]);

    return {
      totalAbonnes,
      totalPDVs,
      chiffreAffaires: totalEncaissements._sum.montantTotal || 0,
      versementsEnAttente,
      evolutionCA: [
        { mois: 'Jan', montant: 1200000 },
        { mois: 'Fev', montant: 1500000 },
        { mois: 'Mar', montant: 1800000 },
        { mois: 'Avr', montant: 1600000 },
        { mois: 'Mai', montant: 2100000 },
        { mois: 'Jun', montant: 2400000 },
      ],
      repartitionFormules: [
        { name: 'ACCESS', value: 35 },
        { name: 'EVASION', value: 28 },
        { name: 'EVASION+', value: 20 },
        { name: 'TOUT CANAL', value: 12 },
        { name: 'PRESTIGE', value: 5 },
      ],
    };
  }
}
