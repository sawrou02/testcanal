import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObjectifDto, UpdateObjectifDto } from './dto/create-objectif.dto';

@Injectable()
export class ObjectifsService {
  constructor(private prisma: PrismaService) {}

  private periodeBounds(periode: string): { start: Date; end: Date } | null {
    const m = periode?.match(/^(\d{4})-(\d{1,2})$/);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
  }

  async findAll(periode?: string) {
    return this.prisma.objectif.findMany({
      where: periode ? { periode } : {},
      include: { pdv: { select: { raisonSociale: true } } },
      orderBy: { periode: 'desc' },
    });
  }

  async create(dto: CreateObjectifDto) {
    return this.prisma.objectif.create({
      data: {
        pdvId: dto.pdvId || null,
        typeObjectif: dto.typeObjectif,
        cible: dto.cible,
        periode: dto.periode,
      },
    });
  }

  async update(id: string, dto: UpdateObjectifDto) {
    return this.prisma.objectif.update({ where: { id }, data: dto });
  }

  /** Compute realised value per objectif from real encaissements in the objectif's own period. */
  async suivi(periode?: string) {
    const objectifs = await this.prisma.objectif.findMany({
      where: periode ? { periode } : {},
      include: { pdv: { select: { raisonSociale: true } } },
      orderBy: { periode: 'desc' },
    });

    const natureMap: Record<string, string> = {
      RECRUTEMENT: 'RECRUTEMENT',
      REABO: 'REABONNEMENT',
      REABONNEMENT: 'REABONNEMENT',
      MIGRATION: 'MIGRATION',
    };

    const results = [];
    for (const o of objectifs) {
      const bounds = this.periodeBounds(o.periode);
      const where: any = {};
      if (bounds) where.date = { gte: bounds.start, lt: bounds.end };
      if (o.pdvId) where.pdvId = o.pdvId;

      let realise = 0;
      if (o.typeObjectif === 'CA') {
        const agg = await this.prisma.encaissement.aggregate({
          where,
          _sum: { montantTotal: true },
        });
        realise = agg._sum.montantTotal || 0;
      } else {
        const nature = natureMap[o.typeObjectif];
        realise = await this.prisma.encaissement.count({
          where: { ...where, ...(nature ? { nature: nature as any } : {}) },
        });
      }

      const taux = o.cible > 0 ? Math.round((realise / o.cible) * 1000) / 10 : 0;
      results.push({
        id: o.id,
        pdv: o.pdv?.raisonSociale ?? 'Distributeur',
        typeObjectif: o.typeObjectif,
        periode: o.periode,
        cible: o.cible,
        realise,
        taux,
      });
    }
    return results;
  }

  remove(id: string) {
    return this.prisma.objectif.delete({ where: { id } });
  }
}
