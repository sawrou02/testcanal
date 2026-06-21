import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ApproDto,
  CreateAccessoireDto,
  LivraisonDto,
  RetourDto,
  UpdateAccessoireDto,
  VenteDto,
} from './dto/accessoire.dto';

@Injectable()
export class AccessoiresService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    const [accessoires, stockGrouped, venteGrouped] = await Promise.all([
      this.prisma.accessoire.findMany({ orderBy: { nom: 'asc' } }),
      this.prisma.stockAccessoire.groupBy({
        by: ['accessoireId'],
        _sum: { quantite: true },
      }),
      this.prisma.venteAccessoire.groupBy({
        by: ['accessoireId'],
        _sum: { quantite: true },
      }),
    ]);
    const stockMap = new Map(stockGrouped.map((g) => [g.accessoireId, g._sum.quantite || 0]));
    const venteMap = new Map(venteGrouped.map((g) => [g.accessoireId, g._sum.quantite || 0]));
    return accessoires.map((a) => ({
      ...a,
      stockReseauTotal: stockMap.get(a.id) || 0,
      venduTotal: venteMap.get(a.id) || 0,
    }));
  }

  async getStats() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [nbAccessoires, stockAgg, ventesAgg, retours] = await Promise.all([
      this.prisma.accessoire.count(),
      this.prisma.accessoire.aggregate({ _sum: { stockEntrepot: true } }),
      this.prisma.venteAccessoire.aggregate({
        where: { date: { gte: start, lt: end } },
        _sum: { montant: true },
      }),
      this.prisma.retourDefectueux.count({ where: { statut: 'EN_ATTENTE' } }),
    ]);
    return {
      nbAccessoires,
      stockEntrepotTotal: stockAgg._sum.stockEntrepot || 0,
      ventesMoisMontant: ventesAgg._sum.montant || 0,
      retoursEnAttente: retours,
    };
  }

  create(dto: CreateAccessoireDto) {
    return this.prisma.accessoire.create({
      data: {
        code: dto.code,
        nom: dto.nom,
        prixUnitaire: dto.prixUnitaire,
        stockEntrepot: dto.stockEntrepot ?? 0,
      },
    });
  }

  update(id: string, dto: UpdateAccessoireDto) {
    return this.prisma.accessoire.update({ where: { id }, data: dto as any });
  }

  async approvisionner(dto: ApproDto, userId: string, ip: string) {
    const updated = await this.prisma.accessoire.update({
      where: { id: dto.accessoireId },
      data: { stockEntrepot: { increment: dto.quantite } },
    });
    await this.audit.log(userId, 'APPRO_ACCESSOIRE', 'ACCESSOIRES', ip);
    return updated;
  }

  stockReseau() {
    return this.prisma.stockAccessoire.findMany({
      include: {
        accessoire: { select: { nom: true, code: true } },
        pdv: { select: { raisonSociale: true } },
      },
      orderBy: { quantite: 'desc' },
    });
  }

  async livrer(dto: LivraisonDto, userId: string, ip: string) {
    return this.prisma.$transaction(async (tx) => {
      const acc = await tx.accessoire.findUniqueOrThrow({ where: { id: dto.accessoireId } });
      if (acc.stockEntrepot < dto.quantite) {
        throw new BadRequestException('Stock entrepôt insuffisant');
      }
      await tx.accessoire.update({
        where: { id: dto.accessoireId },
        data: { stockEntrepot: { decrement: dto.quantite } },
      });
      const stock = await tx.stockAccessoire.upsert({
        where: {
          accessoireId_pdvId: { accessoireId: dto.accessoireId, pdvId: dto.pdvId },
        },
        create: { accessoireId: dto.accessoireId, pdvId: dto.pdvId, quantite: dto.quantite },
        update: { quantite: { increment: dto.quantite } },
      });
      await this.audit.log(userId, 'LIVRAISON_ACCESSOIRE', 'ACCESSOIRES', ip);
      return stock;
    });
  }

  ventes() {
    return this.prisma.venteAccessoire.findMany({
      include: {
        accessoire: { select: { nom: true, code: true } },
        pdv: { select: { raisonSociale: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  async vendre(dto: VenteDto, userId: string, ip: string) {
    return this.prisma.$transaction(async (tx) => {
      const acc = await tx.accessoire.findUniqueOrThrow({ where: { id: dto.accessoireId } });
      const stock = await tx.stockAccessoire.findUnique({
        where: {
          accessoireId_pdvId: { accessoireId: dto.accessoireId, pdvId: dto.pdvId },
        },
      });
      if (!stock || stock.quantite < dto.quantite) {
        throw new BadRequestException('Stock réseau insuffisant pour ce PDV');
      }
      await tx.stockAccessoire.update({
        where: { id: stock.id },
        data: { quantite: { decrement: dto.quantite } },
      });
      const vente = await tx.venteAccessoire.create({
        data: {
          accessoireId: dto.accessoireId,
          pdvId: dto.pdvId,
          quantite: dto.quantite,
          montant: dto.quantite * acc.prixUnitaire,
          date: new Date(),
        },
      });
      await this.audit.log(userId, 'VENTE_ACCESSOIRE', 'ACCESSOIRES', ip);
      return vente;
    });
  }

  retours() {
    return this.prisma.retourDefectueux.findMany({
      include: {
        accessoire: { select: { nom: true, code: true } },
        pdv: { select: { raisonSociale: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async creerRetour(dto: RetourDto, userId: string, ip: string) {
    const retour = await this.prisma.retourDefectueux.create({
      data: {
        accessoireId: dto.accessoireId,
        pdvId: dto.pdvId,
        quantite: dto.quantite,
        motif: dto.motif,
      },
    });
    await this.audit.log(userId, 'RETOUR_ACCESSOIRE', 'ACCESSOIRES', ip);
    return retour;
  }

  remove(id: string) {
    return this.prisma.accessoire.update({ where: { id }, data: { statut: 'INACTIF' as any } });
  }
}
