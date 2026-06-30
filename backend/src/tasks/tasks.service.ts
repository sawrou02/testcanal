import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tâches automatiques quotidiennes.
 * - Passe en ÉCHU les abonnés ACTIF dont l'échéance est dépassée.
 *   (réversible : un réabonnement les repasse en ACTIF automatiquement.)
 * S'exécute au démarrage puis chaque jour à 01h00.
 */
@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger('Tasks');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.marquerEchus().catch(() => undefined);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async daily() {
    await this.marquerEchus().catch(() => undefined);
  }

  /** Marque ÉCHU tout abonné ACTIF dont la date d'échéance est passée. */
  async marquerEchus(): Promise<number> {
    const now = new Date();
    const res = await this.prisma.abonne.updateMany({
      where: { statut: 'ACTIF' as any, dateEcheance: { lt: now } },
      data: { statut: 'ECHU' as any },
    });
    if (res.count > 0) {
      this.logger.log(`${res.count} abonné(s) passé(s) en ÉCHU automatiquement`);
    }
    return res.count;
  }
}
