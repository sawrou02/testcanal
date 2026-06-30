import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GapKitInput {
  pdvId: string;
  clientNom?: string;
  numAbonne?: string;
  kitVendu: string;
  elementsManquants: string;
  statut?: string;
}

@Injectable()
export class GapKitService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.gapKit.findMany({
      include: { pdv: { select: { code: true, raisonSociale: true } } },
      orderBy: { date: 'desc' },
    });
  }

  create(dto: GapKitInput) {
    return this.prisma.gapKit.create({
      data: {
        pdvId: dto.pdvId,
        clientNom: dto.clientNom || null,
        numAbonne: dto.numAbonne || null,
        kitVendu: dto.kitVendu,
        elementsManquants: dto.elementsManquants,
        statut: dto.statut || 'EN_ATTENTE',
      },
      include: { pdv: { select: { code: true, raisonSociale: true } } },
    });
  }

  async update(id: string, dto: Partial<GapKitInput>) {
    const f = await this.prisma.gapKit.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Gap kit introuvable');
    return this.prisma.gapKit.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    const f = await this.prisma.gapKit.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Gap kit introuvable');
    return this.prisma.gapKit.delete({ where: { id } });
  }
}
