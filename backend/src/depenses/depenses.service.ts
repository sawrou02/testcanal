import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepenseDto } from './dto/create-depense.dto';

@Injectable()
export class DepensesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Resolve a YYYY-MM period to [start, end) month bounds, or null if absent.
   */
  private resolvePeriode(periode?: string): { start: Date; end: Date } | null {
    const m = periode?.match(/^(\d{4})-(\d{1,2})$/);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1),
    };
  }

  async findAll(periode?: string) {
    const where: any = {};
    const bounds = this.resolvePeriode(periode);
    if (bounds) {
      where.date = { gte: bounds.start, lt: bounds.end };
    }

    return this.prisma.depense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getStats(periode?: string) {
    const where: any = {};
    const bounds = this.resolvePeriode(periode);
    if (bounds) {
      where.date = { gte: bounds.start, lt: bounds.end };
    }

    const [total, grouped] = await Promise.all([
      this.prisma.depense.aggregate({
        where,
        _sum: { montant: true },
        _count: { _all: true },
      }),
      this.prisma.depense.groupBy({
        by: ['categorie'],
        where,
        _sum: { montant: true },
      }),
    ]);

    return {
      totalMois: total._sum.montant || 0,
      count: total._count._all || 0,
      parCategorie: grouped.map((g) => ({
        categorie: g.categorie,
        montant: g._sum.montant || 0,
      })),
    };
  }

  async create(dto: CreateDepenseDto, userId: string, ip: string) {
    const created = await this.prisma.depense.create({
      data: {
        date: new Date(dto.date),
        categorie: dto.categorie,
        motif: dto.motif,
        montant: dto.montant,
        justificatif: dto.justificatif,
      },
    });

    await this.audit.log(userId, 'CREER_DEPENSE', 'FINANCES', ip);

    return created;
  }

  remove(id: string) {
    return this.prisma.depense.delete({ where: { id } });
  }
}
