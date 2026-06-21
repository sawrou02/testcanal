import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSafeSelect = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  role: true,
  pdvId: true,
  statut: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        ...userSafeSelect,
        pdv: { select: { raisonSociale: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        passwordHash,
        role: dto.role,
        pdvId: dto.pdvId,
      },
      select: userSafeSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: any = {};
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.prenom !== undefined) data.prenom = dto.prenom;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.pdvId !== undefined) data.pdvId = dto.pdvId;
    if (dto.statut !== undefined) data.statut = dto.statut;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSafeSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { pdv: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        pdvId: true,
        statut: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.user.update({ where: { id }, data: { statut: 'INACTIF' as any }, select: { id: true, email: true, statut: true } });
  }
}
