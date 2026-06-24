import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ObjDistInput {
  annee: number;
  trimestre?: number;
  mois?: number;
  formule?: string;
  typeObjectif: string;
  effectif: number;
}

@Injectable()
export class ObjectifsDistributeurService {
  constructor(private prisma: PrismaService) {}

  findAll(annee?: number, typeObjectif?: string) {
    const where: any = {};
    if (annee) where.annee = annee;
    if (typeObjectif) where.typeObjectif = typeObjectif;
    return this.prisma.objectifDistributeur.findMany({
      where,
      orderBy: [{ annee: 'desc' }, { trimestre: 'asc' }, { mois: 'asc' }],
    });
  }

  create(dto: ObjDistInput, userId?: string) {
    return this.prisma.objectifDistributeur.create({
      data: {
        annee: dto.annee,
        trimestre: dto.trimestre ?? null,
        mois: dto.mois ?? null,
        formule: dto.formule || 'TOUTES',
        typeObjectif: dto.typeObjectif,
        effectif: dto.effectif,
        createdById: userId ?? null,
      },
    });
  }

  async update(id: string, dto: Partial<ObjDistInput>) {
    const found = await this.prisma.objectifDistributeur.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Objectif introuvable');
    return this.prisma.objectifDistributeur.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    const found = await this.prisma.objectifDistributeur.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Objectif introuvable');
    return this.prisma.objectifDistributeur.delete({ where: { id } });
  }
}
