import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOCK_THRESHOLD = 5; // échecs avant blocage
const LOCK_WINDOW_MS = 15 * 60 * 1000; // fenêtre de 15 min
const CAPTCHA_THRESHOLD = 3; // échecs avant captcha
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SecurityService {
  private captchas = new Map<string, { answer: number; exp: number }>();
  private seq = 0;

  constructor(private prisma: PrismaService) {}

  private windowStart() {
    return new Date(Date.now() - LOCK_WINDOW_MS);
  }

  /** Enregistre un événement de sécurité (best-effort, ne casse jamais le flux). */
  async log(type: string, identifier?: string, ip = '', message?: string) {
    try {
      await this.prisma.securityEvent.create({
        data: { type, identifier: identifier || null, ip, message: message || null },
      });
    } catch {
      /* ignore */
    }
  }

  private async lastSuccessAt(identifier: string): Promise<Date | null> {
    const ev = await this.prisma.securityEvent.findFirst({
      where: { type: 'LOGIN_OK', identifier },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return ev?.createdAt ?? null;
  }

  /**
   * Nombre d'échecs récents (dans la fenêtre) ET depuis la dernière connexion
   * réussie. On ne supprime jamais l'historique (la page Sécurité le garde) :
   * une connexion réussie « remet le compteur à zéro » via ce filtre.
   */
  async failedCount(identifier: string): Promise<number> {
    const windowStart = this.windowStart();
    const lastOk = await this.lastSuccessAt(identifier);
    const from = lastOk && lastOk > windowStart ? lastOk : windowStart;
    return this.prisma.securityEvent.count({
      where: { type: 'LOGIN_FAILED', identifier, createdAt: { gt: from } },
    });
  }

  async isLocked(identifier: string): Promise<boolean> {
    return (await this.failedCount(identifier)) >= LOCK_THRESHOLD;
  }

  async needCaptcha(identifier: string): Promise<boolean> {
    return (await this.failedCount(identifier)) >= CAPTCHA_THRESHOLD;
  }

  /** Enregistre un échec ; bloque + notifie si le seuil est atteint. */
  async recordFailure(identifier: string, ip: string): Promise<number> {
    await this.log('LOGIN_FAILED', identifier, ip);
    const count = await this.failedCount(identifier);
    if (count >= LOCK_THRESHOLD) {
      await this.log('LOGIN_LOCKED', identifier, ip, `Compte bloqué après ${count} échecs`);
      try {
        await this.prisma.notification.create({
          data: {
            type: 'URGENT',
            message: `🔒 Sécurité : ${count} échecs de connexion pour « ${identifier} » — compte bloqué 15 min.`,
          },
        });
      } catch {
        /* ignore */
      }
    }
    return count;
  }

  // ---------- Captcha (défi mathématique, vérifié côté serveur) ----------
  issueCaptcha(): { id: string; question: string } {
    const x = 1 + Math.floor(Math.random() * 9);
    const y = 1 + Math.floor(Math.random() * 9);
    const id = `cap_${Date.now()}_${++this.seq}`;
    this.captchas.set(id, { answer: x + y, exp: Date.now() + CAPTCHA_TTL_MS });
    this.prune();
    return { id, question: `${x} + ${y} = ?` };
  }

  verifyCaptcha(id?: string, answer?: string | number): boolean {
    if (!id) return false;
    const c = this.captchas.get(id);
    if (!c) return false;
    this.captchas.delete(id);
    if (c.exp < Date.now()) return false;
    return Number(answer) === c.answer;
  }

  private prune() {
    const now = Date.now();
    for (const [k, v] of this.captchas) if (v.exp < now) this.captchas.delete(k);
  }

  // ---------- Consultation (page Sécurité) ----------
  getEvents(limit = 200) {
    return this.prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }

  async getStats() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [failedToday, deniedToday, recentFails] = await Promise.all([
      this.prisma.securityEvent.count({ where: { type: 'LOGIN_FAILED', createdAt: { gte: dayStart } } }),
      this.prisma.securityEvent.count({ where: { type: 'ACCESS_DENIED', createdAt: { gte: dayStart } } }),
      this.prisma.securityEvent.findMany({
        where: { type: 'LOGIN_FAILED', createdAt: { gte: this.windowStart() } },
        select: { identifier: true },
      }),
    ]);
    const counts = new Map<string, number>();
    for (const r of recentFails) if (r.identifier) counts.set(r.identifier, (counts.get(r.identifier) || 0) + 1);
    const lockedAccounts = [...counts.values()].filter((n) => n >= LOCK_THRESHOLD).length;
    return { failedToday, accessDeniedToday: deniedToday, lockedAccounts };
  }
}
