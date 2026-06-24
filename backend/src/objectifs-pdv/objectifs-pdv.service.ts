import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ObjPdvInput {
  pdvId: string;
  annee: number;
  mois: number;
  typeObjectif: string;
  effectif: number;
}

@Injectable()
export class ObjectifsPdvService {
  constructor(private prisma: PrismaService) {}

  findAll(annee?: number, mois?: number) {
    const where: any = {};
    if (annee) where.annee = annee;
    if (mois) where.mois = mois;
    return this.prisma.objectifPdv.findMany({
      where,
      include: { pdv: { select: { code: true, raisonSociale: true, secteurId: true } } },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
    });
  }

  create(dto: ObjPdvInput, userId?: string) {
    return this.prisma.objectifPdv.upsert({
      where: {
        pdvId_annee_mois_typeObjectif: {
          pdvId: dto.pdvId, annee: dto.annee, mois: dto.mois, typeObjectif: dto.typeObjectif,
        },
      },
      update: { effectif: dto.effectif },
      create: { ...dto, createdById: userId ?? null },
    });
  }

  async update(id: string, dto: Partial<ObjPdvInput>) {
    const f = await this.prisma.objectifPdv.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Objectif introuvable');
    return this.prisma.objectifPdv.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    const f = await this.prisma.objectifPdv.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Objectif introuvable');
    return this.prisma.objectifPdv.delete({ where: { id } });
  }

  /** Import groupé (ex. depuis un CSV) : upsert ligne par ligne. */
  async importMany(items: ObjPdvInput[], userId?: string) {
    let ok = 0;
    for (const it of items) {
      if (!it.pdvId || !it.typeObjectif) continue;
      await this.create(it, userId);
      ok++;
    }
    return { imported: ok };
  }
}
