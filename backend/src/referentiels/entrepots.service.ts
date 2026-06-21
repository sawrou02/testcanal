import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntrepotDto } from './dto/create-entrepot.dto';
import { UpdateEntrepotDto } from './dto/update-entrepot.dto';

@Injectable()
export class EntrepotsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.entrepot.findMany({
      include: { _count: { select: { decodeurs: true } } },
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateEntrepotDto) {
    return this.prisma.entrepot.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateEntrepotDto) {
    return this.prisma.entrepot.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    return this.prisma.entrepot.update({ where: { id }, data: { statut: 'INACTIF' as any } });
  }
}
