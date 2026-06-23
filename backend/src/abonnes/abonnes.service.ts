import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAbonneDto } from './dto/create-abonne.dto';
import { UpdateAbonneDto } from './dto/update-abonne.dto';

const ABONNE_INCLUDE = {
  formule: {
    select: { id: true, code: true, nomCommercial: true, prixFormule: true },
  },
  pdv: { select: { id: true, raisonSociale: true } },
  decodeur: { select: { numSerie: true, type: true } },
};

@Injectable()
export class AbonnesService {
  constructor(private prisma: PrismaService) {}

  async search(q?: string) {
    const where: any = {};
    if (q) {
      // SQLite : `contains` est déjà insensible à la casse pour l'ASCII,
      // donc pas de `mode: 'insensitive'` (non supporté par ce connecteur).
      where.OR = [
        { numAbonne: { contains: q } },
        { nom: { contains: q } },
        { prenom: { contains: q } },
        { tel1: { contains: q } },
      ];
    }

    return this.prisma.abonne.findMany({
      where,
      include: ABONNE_INCLUDE,
      orderBy: { nom: 'asc' },
      take: 20,
    });
  }

  async findOne(id: string) {
    return this.prisma.abonne.findUnique({
      where: { id },
      include: ABONNE_INCLUDE,
    });
  }

  /** Crée un abonné (recrutement). Le n° abonné est généré s'il est vide. */
  async create(dto: CreateAbonneDto) {
    const numAbonne =
      dto.numAbonne?.trim() || `SD-${Date.now().toString(36).toUpperCase()}`;

    const existing = await this.prisma.abonne.findUnique({ where: { numAbonne } });
    if (existing) {
      throw new BadRequestException('Ce numéro d’abonné existe déjà');
    }

    // Par défaut, échéance = aujourd'hui (un encaissement la prolongera).
    const dateEcheance = dto.dateEcheance
      ? new Date(dto.dateEcheance)
      : new Date();

    return this.prisma.abonne.create({
      data: {
        numAbonne,
        nom: dto.nom,
        prenom: dto.prenom,
        tel1: dto.tel1,
        tel2: dto.tel2 || null,
        formuleId: dto.formuleId,
        pdvId: dto.pdvId,
        decodeurId: dto.decodeurId || null,
        dateEcheance,
        statut: dto.statut || 'ACTIF',
      },
      include: ABONNE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateAbonneDto) {
    const abonne = await this.prisma.abonne.findUnique({ where: { id } });
    if (!abonne) throw new NotFoundException('Abonné introuvable');

    const data: any = { ...dto };
    if (dto.tel2 !== undefined) data.tel2 = dto.tel2 || null;
    if (dto.decodeurId !== undefined) data.decodeurId = dto.decodeurId || null;
    if (dto.dateEcheance) data.dateEcheance = new Date(dto.dateEcheance);

    return this.prisma.abonne.update({
      where: { id },
      data,
      include: ABONNE_INCLUDE,
    });
  }

  /**
   * Suppression d'un abonné. Comme un abonné a un historique d'encaissements,
   * on ne l'efface pas : on le passe en RESILIE (désactivation propre).
   */
  async remove(id: string) {
    const abonne = await this.prisma.abonne.findUnique({ where: { id } });
    if (!abonne) throw new NotFoundException('Abonné introuvable');

    return this.prisma.abonne.update({
      where: { id },
      data: { statut: 'RESILIE' },
    });
  }
}
