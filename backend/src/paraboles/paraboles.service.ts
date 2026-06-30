import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ParaboleInput {
  pdvId: string;
  quantiteVendue: number;
  quantiteStock?: number;
  technicien?: string;
}

@Injectable()
export class ParabolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.venteParabole.findMany({
      include: { pdv: { select: { code: true, raisonSociale: true } } },
      orderBy: { date: 'desc' },
    });
  }

  create(dto: ParaboleInput) {
    return this.prisma.venteParabole.create({
      data: {
        pdvId: dto.pdvId,
        quantiteVendue: dto.quantiteVendue,
        quantiteStock: dto.quantiteStock ?? 0,
        technicien: dto.technicien || null,
      },
      include: { pdv: { select: { code: true, raisonSociale: true } } },
    });
  }

  async update(id: string, dto: Partial<ParaboleInput>) {
    const f = await this.prisma.venteParabole.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Vente parabole introuvable');
    return this.prisma.venteParabole.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    const f = await this.prisma.venteParabole.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Vente parabole introuvable');
    return this.prisma.venteParabole.delete({ where: { id } });
  }
}
