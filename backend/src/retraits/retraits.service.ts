import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';

const PDV_SELECT = { code: true, raisonSociale: true };

@Injectable()
export class RetraitsService {
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

    const rows = await this.prisma.retrait.findMany({
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
        this.prisma.retrait.aggregate({
          _sum: { montant: true },
          where: {
            statut: 'VALIDE' as any,
            dateVersement: { gte: monthStart, lt: monthEnd },
          },
        }),
        this.prisma.retrait.count({ where: { statut: 'ENATTENTE' as any } }),
        this.prisma.retrait.count({ where: { statut: 'REJETE' as any } }),
        this.prisma.retrait.count(),
      ],
    );

    return {
      validesMontantMois: valides._sum.montant || 0,
      enAttenteCount,
      rejeteCount,
      totalCount,
    };
  }

  async create(dto: CreateRetraitDto) {
    return this.prisma.retrait.create({
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
    const retrait = await this.prisma.retrait.findUnique({ where: { id } });
    if (!retrait) {
      throw new BadRequestException('Retrait introuvable');
    }
    if (retrait.statut !== ('ENATTENTE' as any)) {
      throw new BadRequestException(
        "Le retrait n'est pas en attente de validation",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.retrait.update({
        where: { id },
        data: { statut: 'VALIDE' as any, valideParId: userId },
      });
      // Cash withdrawn increases the amount owed by the PDV.
      await tx.pDV.update({
        where: { id: retrait.pdvId },
        data: { soldeActuel: { increment: retrait.montant } },
      });
      await tx.banque.update({
        where: { id: retrait.banqueId },
        data: { soldeActuel: { decrement: retrait.montant } },
      });
      return updated;
    });

    await this.audit.log(userId, 'VALIDER_RETRAIT', 'FINANCES', ip);
    return result;
  }

  async rejeter(id: string, motifRejet: string, userId: string, ip: string) {
    const retrait = await this.prisma.retrait.findUnique({ where: { id } });
    if (!retrait) {
      throw new BadRequestException('Retrait introuvable');
    }
    if (retrait.statut !== ('ENATTENTE' as any)) {
      throw new BadRequestException(
        "Le retrait n'est pas en attente de validation",
      );
    }

    const updated = await this.prisma.retrait.update({
      where: { id },
      data: { statut: 'REJETE' as any, motifRejet, valideParId: userId },
    });

    await this.audit.log(userId, 'REJETER_RETRAIT', 'FINANCES', ip);
    return updated;
  }
}
