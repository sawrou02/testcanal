import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LivraisonVadDto, VenteKitDto } from './dto/vad.dto';

@Injectable()
export class VadService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** VAD agents = PDVs of type VAD, with their assigned decoder stock and kit sales. */
  async agents() {
    const [agents, stockGrouped, kitGrouped] = await Promise.all([
      this.prisma.pDV.findMany({
        where: { type: 'VAD' as any },
        select: { id: true, code: true, raisonSociale: true, secteur: { select: { nom: true } } },
        orderBy: { raisonSociale: 'asc' },
      }),
      this.prisma.decodeur.groupBy({
        by: ['pdvId'],
        where: { statut: 'EN_STOCK_PDV' as any },
        _count: { _all: true },
      }),
      this.prisma.venteKit.groupBy({
        by: ['vadPdvId'],
        _count: { _all: true },
        _sum: { montant: true },
      }),
    ]);
    const stockMap = new Map(stockGrouped.map((g) => [g.pdvId, g._count._all]));
    const kitMap = new Map(kitGrouped.map((g) => [g.vadPdvId, g]));
    return agents.map((a) => ({
      id: a.id,
      code: a.code,
      raisonSociale: a.raisonSociale,
      secteur: a.secteur?.nom ?? '—',
      stockDecodeurs: stockMap.get(a.id) || 0,
      kitsVendus: kitMap.get(a.id)?._count._all || 0,
      caKits: kitMap.get(a.id)?._sum.montant || 0,
    }));
  }

  async stats() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const vadPdvs = await this.prisma.pDV.findMany({
      where: { type: 'VAD' as any },
      select: { id: true },
    });
    const ids = vadPdvs.map((p) => p.id);
    const [decodeursAttribues, kits, caAgg] = await Promise.all([
      this.prisma.decodeur.count({ where: { pdvId: { in: ids }, statut: 'EN_STOCK_PDV' as any } }),
      this.prisma.venteKit.count({ where: { date: { gte: start, lt: end } } }),
      this.prisma.venteKit.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { montant: true } }),
    ]);
    return {
      nbAgents: ids.length,
      decodeursAttribues,
      kitsVendusMois: kits,
      caKitsMois: caAgg._sum.montant || 0,
    };
  }

  stock(vadId?: string) {
    return this.prisma.decodeur.findMany({
      where: {
        statut: 'EN_STOCK_PDV' as any,
        ...(vadId ? { pdvId: vadId } : { pdv: { type: 'VAD' as any } }),
      },
      include: { pdv: { select: { raisonSociale: true } } },
      orderBy: { numSerie: 'asc' },
      take: 500,
    });
  }

  ventes() {
    return this.prisma.venteKit.findMany({
      include: { vadPdv: { select: { raisonSociale: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  /** Assign `quantite` warehouse decoders of `type` to a VAD agent. */
  async livraison(dto: LivraisonVadDto, userId: string, ip: string) {
    return this.prisma.$transaction(async (tx) => {
      const dispo = await tx.decodeur.findMany({
        where: { statut: 'EN_STOCK_ENTREPOT' as any, type: dto.type as any },
        take: dto.quantite,
        select: { id: true },
      });
      if (dispo.length < dto.quantite) {
        throw new BadRequestException("Stock entrepôt insuffisant pour ce type de décodeur");
      }
      await tx.decodeur.updateMany({
        where: { id: { in: dispo.map((d) => d.id) } },
        data: { statut: 'EN_STOCK_PDV' as any, pdvId: dto.vadPdvId, entrepotId: null },
      });
      await this.audit.log(userId, 'LIVRAISON_VAD', 'VAD', ip);
      return { livres: dispo.length };
    });
  }

  /** Sell a kit: record the sale and mark one of the agent's decoders as VENDU. */
  async venteKit(dto: VenteKitDto, userId: string, ip: string) {
    return this.prisma.$transaction(async (tx) => {
      const dec = await tx.decodeur.findFirst({
        where: { pdvId: dto.vadPdvId, statut: 'EN_STOCK_PDV' as any, type: dto.decodeurType as any },
        select: { id: true },
      });
      if (!dec) {
        throw new BadRequestException("Aucun décodeur disponible chez ce VAD pour ce type");
      }
      await tx.decodeur.update({ where: { id: dec.id }, data: { statut: 'VENDU' as any } });
      const vente = await tx.venteKit.create({
        data: {
          vadPdvId: dto.vadPdvId,
          decodeurType: dto.decodeurType as any,
          clientNom: dto.clientNom,
          montant: dto.montant,
          date: new Date(),
        },
      });
      await this.audit.log(userId, 'VENTE_KIT_VAD', 'VAD', ip);
      return vente;
    });
  }
}
