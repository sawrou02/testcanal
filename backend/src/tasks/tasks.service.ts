import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService, normaliserNumero } from '../sms/sms.service';
import { messageRelance } from '../service-abonnement/service-abonnement.service';

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

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
  ) {}

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

    const select = { prenom: true, nom: true, tel1: true, dateEcheance: true };
    const [urgents, echus] = await Promise.all([
      this.prisma.abonne.findMany({
        where: { statut: 'ACTIF' as any, dateEcheance: { gte: now, lte: urgentLimite } },
        select,
      }),
      this.prisma.abonne.findMany({
        where: { statut: 'ECHU' as any, dateEcheance: { gte: echuDebut, lt: now } },
        select,
      }),
    ]);
    const nbUrgent = urgents.length;
    const nbEchus = echus.length;
    const total = nbUrgent + nbEchus;
    if (total === 0) return 0;

    // Anti-doublon : une seule notification de relance par jour.
    const dejaAujourdhui = await this.prisma.notification.findFirst({
      where: {
        createdAt: { gte: jourDebut },
        message: { startsWith: 'Relances :' },
      },
    });
    if (dejaAujourdhui) return total;

    // Envoi automatique si la passerelle est activée pour l'envoi auto.
    const config = await this.sms.getConfig();
    if (config.envoiAuto) {
      const messages = [...echus, ...urgents]
        .map((a) => ({ to: normaliserNumero(a.tel1), body: messageRelance(a) }))
        .filter((m) => m.to);
      const res = await this.sms.envoyer(messages);
      if (!res.simulated) {
        await this.prisma.notification.create({
          data: {
            type: 'OK',
            message: `Relances : ${res.sent} SMS de relance envoyé(s) automatiquement ce matin (${nbEchus} échu(s), ${nbUrgent} urgent(s))${res.failed ? ` — ${res.failed} échec(s)` : ''}.`,
            lien: '/app/relances-reabo',
          },
        });
        this.logger.log(`Relances auto : ${res.sent} SMS envoyés, ${res.failed} échec(s)`);
        return res.sent;
      }
    }

    // Semi-automatique : on prépare la liste et on alerte (envoi en 1 clic).
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
