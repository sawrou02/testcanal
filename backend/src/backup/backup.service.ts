import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Sauvegardes automatiques de la base SQLite.
 *
 * - Une sauvegarde au démarrage du serveur.
 * - Une sauvegarde chaque jour (02h00).
 * - On conserve les 14 dernières (les plus anciennes sont supprimées).
 *
 * La copie utilise `VACUUM INTO` : SQLite crée une copie **cohérente** du
 * fichier même pendant que l'application l'utilise (pas de fichier corrompu).
 *
 * En production PostgreSQL (DATABASE_URL = postgresql://…), ce service ne fait
 * rien : la sauvegarde se fera côté serveur (pg_dump / snapshots).
 */
@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger('Backup');
  private readonly keep = 14;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Sauvegarde au démarrage (sans bloquer le boot en cas d'échec).
    await this.runBackup('démarrage').catch(() => undefined);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyBackup() {
    await this.runBackup('quotidienne').catch(() => undefined);
  }

  private resolveSqlitePath(): string | null {
    const url = process.env.DATABASE_URL || 'file:./sendistri.db';
    if (!url.startsWith('file:')) return null; // pas du SQLite -> on n'agit pas
    let p = url.slice('file:'.length);
    // Prisma résout un chemin SQLite relatif par rapport au dossier `prisma/`.
    if (!path.isAbsolute(p)) p = path.join(process.cwd(), 'prisma', p);
    return p;
  }

  private get backupDir(): string {
    return path.join(process.cwd(), 'backups');
  }

  /** Lance une sauvegarde. Retourne le chemin du fichier créé. */
  async runBackup(motif = 'manuelle'): Promise<string | null> {
    const dbPath = this.resolveSqlitePath();
    if (!dbPath || !fs.existsSync(dbPath)) {
      this.logger.warn('Base SQLite introuvable : sauvegarde ignorée.');
      return null;
    }

    fs.mkdirSync(this.backupDir, { recursive: true });

    const now = new Date();
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const target = path.join(this.backupDir, `sendistri-${stamp}.db`);
    // SQLite accepte les '/' même sous Windows ; on échappe les apostrophes.
    const sqlPath = target.replace(/\\/g, '/').replace(/'/g, "''");

    await this.prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath}'`);
    this.logger.log(`Sauvegarde ${motif} créée : ${path.basename(target)}`);

    this.prune();
    return target;
  }

  /** Ne conserve que les `keep` sauvegardes les plus récentes. */
  private prune() {
    try {
      const files = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.startsWith('sendistri-') && f.endsWith('.db'))
        .sort();
      const excess = files.length - this.keep;
      for (let i = 0; i < excess; i++) {
        fs.unlinkSync(path.join(this.backupDir, files[i]));
      }
    } catch {
      /* nettoyage best-effort */
    }
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
