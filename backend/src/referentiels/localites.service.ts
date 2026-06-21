import { ConflictException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocaliteDto } from './dto/create-localite.dto';
import { UpdateLocaliteDto } from './dto/update-localite.dto';

@Injectable()
export class LocalitesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.localite.findMany({
      include: { secteur: { select: { nom: true } } },
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateLocaliteDto) {
    return this.prisma.localite.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocaliteDto) {
    return this.prisma.localite.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    try {
      return await this.prisma.localite.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') throw new ConflictException('Localité utilisée par des PDV, suppression impossible.');
      throw e;
    }
  }
}
