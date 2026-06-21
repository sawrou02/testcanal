import { ConflictException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBanqueDto } from './dto/create-banque.dto';
import { UpdateBanqueDto } from './dto/update-banque.dto';

@Injectable()
export class BanquesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banque.findMany({
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateBanqueDto) {
    return this.prisma.banque.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateBanqueDto) {
    return this.prisma.banque.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.banque.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') throw new ConflictException('Banque utilisée par des opérations, suppression impossible.');
      throw e;
    }
  }
}
