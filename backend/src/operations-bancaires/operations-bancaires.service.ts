import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationsBancairesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const [versements, retraits, banques] = await Promise.all([
      this.prisma.versement.findMany({
        include: { pdv: { select: { raisonSociale: true } } },
        orderBy: { dateVersement: 'desc' },
        take: 200,
      }),
      this.prisma.retrait.findMany({
        include: { pdv: { select: { raisonSociale: true } } },
        orderBy: { dateVersement: 'desc' },
        take: 200,
      }),
      this.prisma.banque.findMany({ select: { id: true, nom: true } }),
    ]);

    const banqueMap = new Map(banques.map((b) => [b.id, b.nom]));

    const versementOps = versements.map((v) => ({
      id: v.id,
      date: v.dateVersement,
      type: 'VERSEMENT' as const,
      sens: 'CREDIT' as const,
      pdv: { raisonSociale: v.pdv.raisonSociale },
      banqueNom: banqueMap.get(v.banqueId) ?? null,
      montant: v.montant,
      statut: v.statut,
    }));

    const retraitOps = retraits.map((r) => ({
      id: r.id,
      date: r.dateVersement,
      type: 'RETRAIT' as const,
      sens: 'DEBIT' as const,
      pdv: { raisonSociale: r.pdv.raisonSociale },
      banqueNom: banqueMap.get(r.banqueId) ?? null,
      montant: r.montant,
      statut: r.statut,
    }));

    return [...versementOps, ...retraitOps]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 200);
  }
}
