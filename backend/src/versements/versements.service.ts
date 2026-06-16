import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVersementDto } from './dto/create-versement.dto';

const PDV_SELECT = { code: true, raisonSociale: true };

@Injectable()
export class VersementsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async attachBanqueNom<T extends { banqueId: string }>(
    rows: T[],
  ): Promise<(T & { banqueNom: string | null })[]> {
    const banques = await this.prisma.banque.findMany({
      select: { id: true, nom: true },
    });
    const map = new Map(banques.map((b) => [b.id, b.nom]));
    return rows.map((r) => ({ ...r, banqueNom: map.get(r.banqueId) ?? null }));
  }

  async findAll(statut?: string) {
    const where: any = {};
    if (statut) {
      where.statut = statut as any;
    }

    const rows = await this.prisma.versement.findMany({
      where,
      include: { pdv: { select: PDV_SELECT } },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachBanqueNom(rows);
  }

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [valides, enAttenteCount, rejeteCount, totalCount] = await Promise.all(
      [
        this.prisma.versement.aggregate({
          _sum: { montant: true },
          where: {
            statut: 'VALIDE' as any,
            dateVersement: { gte: monthStart, lt: monthEnd },
          },
        }),
        this.prisma.versement.count({ where: { statut: 'ENATTENTE' as any } }),
        this.prisma.versement.count({ where: { statut: 'REJETE' as any } }),
        this.prisma.versement.count(),
      ],
    );

    return {
      validesMontantMois: valides._sum.montant || 0,
      enAttenteCount,
      rejeteCount,
      totalCount,
    };
  }

  async create(dto: CreateVersementDto) {
    return this.prisma.versement.create({
      data: {
        pdvId: dto.pdvId,
        montant: dto.montant,
        banqueId: dto.banqueId,
        dateVersement: new Date(dto.dateVersement),
        periode: dto.periode,
        libelle: dto.libelle,
        numBordereau: dto.numBordereau,
        photoBordereau: dto.photoBordereau,
        statut: 'ENATTENTE' as any,
      },
    });
  }

  async valider(id: string, userId: string, ip: string) {
    const versement = await this.prisma.versement.findUnique({ where: { id } });
    if (!versement) {
      throw new BadRequestException('Versement introuvable');
    }
    if (versement.statut !== ('ENATTENTE' as any)) {
      throw new BadRequestException(
        "Le versement n'est pas en attente de validation",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.versement.update({
        where: { id },
        data: { statut: 'VALIDE' as any, valideParId: userId },
      });
      // Validated versement reduces amount owed by the PDV.
      await tx.pDV.update({
        where: { id: versement.pdvId },
        data: { soldeActuel: { decrement: versement.montant } },
      });
      await tx.banque.update({
        where: { id: versement.banqueId },
        data: { soldeActuel: { increment: versement.montant } },
      });
      return updated;
    });

    await this.audit.log(userId, 'VALIDER_VERSEMENT', 'FINANCES', ip);
    return result;
  }

  async rejeter(id: string, motifRejet: string, userId: string, ip: string) {
    const versement = await this.prisma.versement.findUnique({ where: { id } });
    if (!versement) {
      throw new BadRequestException('Versement introuvable');
    }
    if (versement.statut !== ('ENATTENTE' as any)) {
      throw new BadRequestException(
        "Le versement n'est pas en attente de validation",
      );
    }

    const updated = await this.prisma.versement.update({
      where: { id },
      data: { statut: 'REJETE' as any, motifRejet, valideParId: userId },
    });

    await this.audit.log(userId, 'REJETER_VERSEMENT', 'FINANCES', ip);
    return updated;
  }
}
