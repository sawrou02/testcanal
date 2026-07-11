import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/** Fenêtres (en jours) de l'échéancier de relance quotidien. */
const RELANCE_URGENT_JOURS = 7; // à échoir sous 7 jours
const RELANCE_ECHU_JOURS = 30; // échus récents (≤ 30 jours)

/**
 * Tâches automatiques quotidiennes.
 * - 01h00 : passe en ÉCHU les abonnés ACTIF dont l'échéance est dépassée.
 *   (réversible : un réabonnement les repasse en ACTIF automatiquement.)
 * - 07h00 : prépare l'échéancier de relance du jour et crée une alerte
 *   « X abonnés à relancer aujourd'hui » (semi-automatique : l'équipe envoie
 *   ensuite en masse en 1 clic depuis la page Relances Réabo).
 * marquerEchus s'exécute aussi au démarrage.
 */
@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger('Tasks');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.marquerEchus().catch(() => undefined);
    // Prépare l'alerte de relance au démarrage si elle n'existe pas déjà pour aujourd'hui.
    await this.preparerRelancesDuJour().catch(() => undefined);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async daily() {
    await this.marquerEchus().catch(() => undefined);
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async matin() {
    await this.marquerEchus().catch(() => undefined);
    await this.preparerRelancesDuJour().catch(() => undefined);
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

  /**
   * Compte les abonnés à relancer aujourd'hui (échus récents + à échoir sous 7 j)
   * et crée une notification-alerte pointant vers la page Relances Réabo.
   * Idempotent : une seule alerte par jour (n'en recrée pas si déjà présente).
   */
  async preparerRelancesDuJour(): Promise<number> {
    const now = new Date();
    const jourDebut = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const urgentLimite = new Date(jourDebut);
    urgentLimite.setDate(urgentLimite.getDate() + RELANCE_URGENT_JOURS);
    const echuDebut = new Date(jourDebut);
    echuDebut.setDate(echuDebut.getDate() - RELANCE_ECHU_JOURS);

    const [nbUrgent, nbEchus] = await Promise.all([
      this.prisma.abonne.count({
        where: { statut: 'ACTIF' as any, dateEcheance: { gte: now, lte: urgentLimite } },
      }),
      this.prisma.abonne.count({
        where: { statut: 'ECHU' as any, dateEcheance: { gte: echuDebut, lt: now } },
      }),
    ]);
    const total = nbUrgent + nbEchus;
    if (total === 0) return 0;

    // Anti-doublon : pas deux alertes de relance le même jour.
    const dejaAujourdhui = await this.prisma.notification.findFirst({
      where: {
        createdAt: { gte: jourDebut },
        message: { startsWith: 'Relances :' },
      },
    });
    if (dejaAujourdhui) return total;

    await this.prisma.notification.create({
      data: {
        type: 'WARN',
        message: `Relances : ${total} abonné(s) à relancer aujourd'hui (${nbEchus} échu(s), ${nbUrgent} urgent(s)). Ouvrez « Relances Réabo » pour envoyer.`,
        lien: '/app/relances-reabo',
      },
    });
    this.logger.log(`Alerte relance créée : ${total} abonné(s) à relancer`);
    return total;
  }
}
