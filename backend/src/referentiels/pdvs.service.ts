import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePdvDto } from './dto/create-pdv.dto';
import { UpdatePdvDto } from './dto/update-pdv.dto';

@Injectable()
export class PdvsService {
  constructor(private prisma: PrismaService) {}

  async augmenterCaution(id: string, montant: number) {
    return this.prisma.pDV.update({
      where: { id },
      data: { caution: { increment: montant } },
    });
  }

  async findAll(type?: string, statut?: string) {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (statut) {
      where.statut = statut;
    }

    return this.prisma.pDV.findMany({
      where,
      include: {
        secteur: { select: { nom: true } },
        localite: { select: { nom: true } },
        _count: { select: { users: true, abonnes: true } },
      },
      orderBy: { raisonSociale: 'asc' },
    });
  }

  async getSoldes() {
    const pdvs = await this.prisma.pDV.findMany({
      include: { secteur: { select: { nom: true } } },
      orderBy: { raisonSociale: 'asc' },
    });

    const encGroups = await this.prisma.encaissement.groupBy({
      by: ['pdvId'],
      _sum: { montantTotal: true },
    });
    const versGroups = await this.prisma.versement.groupBy({
      by: ['pdvId'],
      where: { statut: 'VALIDE' as any },
      _sum: { montant: true },
    });

    const encMap = new Map<string, number>();
    for (const g of encGroups) {
      encMap.set(g.pdvId, g._sum.montantTotal || 0);
    }
    const versMap = new Map<string, number>();
    for (const g of versGroups) {
      versMap.set(g.pdvId, g._sum.montant || 0);
    }

    return pdvs.map((pdv) => {
      const totalEncaissements = encMap.get(pdv.id) || 0;
      const totalVersements = versMap.get(pdv.id) || 0;
      const solde = totalEncaissements - totalVersements;
      const plafond = pdv.caution;
      return {
        id: pdv.id,
        code: pdv.code,
        raisonSociale: pdv.raisonSociale,
        secteur: { nom: pdv.secteur.nom },
        totalEncaissements,
        totalVersements,
        solde,
        plafond,
        depassement: solde > pdv.caution,
        taux: pdv.caution > 0 ? solde / pdv.caution : 0,
      };
    });
  }

  async findOne(id: string) {
    return this.prisma.pDV.findUnique({
      where: { id },
      include: {
        secteur: { select: { nom: true } },
        localite: { select: { nom: true } },
        users: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            role: true,
            statut: true,
          },
        },
      },
    });
  }

  async create(dto: CreatePdvDto) {
    return this.prisma.pDV.create({ data: dto as any });
  }

  async update(id: string, dto: UpdatePdvDto) {
    return this.prisma.pDV.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    return this.prisma.pDV.update({ where: { id }, data: { statut: 'INACTIF' as any } });
  }
}
