import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Gardien de schéma : au démarrage, garantit en SQL brut que les tables et
 * colonnes récentes existent — SANS dépendre de l'outil `prisma` (devDep,
 * souvent absent en production). Utilise la connexion @prisma/client déjà
 * active. Tout est idempotent (CREATE ... IF NOT EXISTS, ALTER en try/catch).
 *
 * Corrige les erreurs « colonne/table manquante » (importKey, ConfigRegion,
 * Message, Document…) sur les bases installées avant l'ajout de ces champs.
 */
@Injectable()
export class SchemaGuardService implements OnModuleInit {
  private readonly logger = new Logger('SchemaGuard');
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensure();
      this.logger.log('Schéma vérifié / réparé.');
    } catch (e) {
      this.logger.warn(`Vérification du schéma incomplète : ${(e as Error).message?.slice(0, 200)}`);
    }
  }

  private async run(sql: string) {
    try {
      await this.prisma.$executeRawUnsafe(sql);
    } catch {
      // Ignore (colonne/table/index déjà présent, ou ADD COLUMN en double).
    }
  }

  private async ensure() {
    // --- Tables récentes (CREATE IF NOT EXISTS) ---
    const tables: string[] = [
      `CREATE TABLE IF NOT EXISTS "ConfigRegion" ("id" TEXT NOT NULL PRIMARY KEY DEFAULT 'region', "pays" TEXT NOT NULL DEFAULT 'SN', "devise" TEXT NOT NULL DEFAULT 'XOF', "symbole" TEXT NOT NULL DEFAULT 'F', "symboleAvant" BOOLEAN NOT NULL DEFAULT false, "decimales" INTEGER NOT NULL DEFAULT 0, "langue" TEXT NOT NULL DEFAULT 'fr', "locale" TEXT NOT NULL DEFAULT 'fr-FR', "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "ConfigSms" ("id" TEXT NOT NULL PRIMARY KEY DEFAULT 'sms', "provider" TEXT NOT NULL DEFAULT 'CUSTOM', "apiUrl" TEXT NOT NULL DEFAULT '', "apiKey" TEXT NOT NULL DEFAULT '', "apiSecret" TEXT NOT NULL DEFAULT '', "sender" TEXT NOT NULL DEFAULT 'SENDISTRI', "actif" BOOLEAN NOT NULL DEFAULT false, "envoiAuto" BOOLEAN NOT NULL DEFAULT false, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Document" ("id" TEXT NOT NULL PRIMARY KEY, "filename" TEXT NOT NULL, "storedName" TEXT NOT NULL, "mimeType" TEXT NOT NULL DEFAULT '', "size" INTEGER NOT NULL DEFAULT 0, "category" TEXT NOT NULL DEFAULT 'Général', "description" TEXT, "uploadedById" TEXT, "uploadedByName" TEXT NOT NULL DEFAULT '', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "userName" TEXT NOT NULL DEFAULT '', "content" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "SecurityEvent" ("id" TEXT NOT NULL PRIMARY KEY, "type" TEXT NOT NULL, "identifier" TEXT, "ip" TEXT NOT NULL DEFAULT '', "message" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "ParametreCommission" ("id" TEXT NOT NULL PRIMARY KEY, "typeCommission" TEXT NOT NULL, "libelle" TEXT NOT NULL DEFAULT '', "valeur" REAL NOT NULL, "unite" TEXT NOT NULL DEFAULT 'F', "actif" BOOLEAN NOT NULL DEFAULT true, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "ObjectifDistributeur" ("id" TEXT NOT NULL PRIMARY KEY, "annee" INTEGER NOT NULL, "trimestre" INTEGER, "mois" INTEGER, "formule" TEXT NOT NULL DEFAULT 'TOUTES', "typeObjectif" TEXT NOT NULL, "effectif" INTEGER NOT NULL, "createdById" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "ObjectifPdv" ("id" TEXT NOT NULL PRIMARY KEY, "pdvId" TEXT NOT NULL, "annee" INTEGER NOT NULL, "mois" INTEGER NOT NULL, "typeObjectif" TEXT NOT NULL, "effectif" INTEGER NOT NULL, "createdById" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "GapKit" ("id" TEXT NOT NULL PRIMARY KEY, "pdvId" TEXT NOT NULL, "clientNom" TEXT, "numAbonne" TEXT, "kitVendu" TEXT NOT NULL, "elementsManquants" TEXT NOT NULL, "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE', "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "VenteParabole" ("id" TEXT NOT NULL PRIMARY KEY, "pdvId" TEXT NOT NULL, "quantiteVendue" INTEGER NOT NULL DEFAULT 0, "quantiteStock" INTEGER NOT NULL DEFAULT 0, "technicien" TEXT, "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    ];
    for (const sql of tables) await this.run(sql);

    // --- Colonnes ajoutées à des tables existantes (ALTER ADD COLUMN) ---
    const columns: string[] = [
      `ALTER TABLE "Encaissement" ADD COLUMN "importKey" TEXT`,
      `ALTER TABLE "Abonne" ADD COLUMN "numeroContrat" TEXT`,
      `ALTER TABLE "Abonne" ADD COLUMN "dateProchainRdv" DATETIME`,
      `ALTER TABLE "Abonne" ADD COLUMN "canalReabo" TEXT`,
    ];
    for (const sql of columns) await this.run(sql);

    // --- Index uniques ---
    await this.run(`CREATE UNIQUE INDEX IF NOT EXISTS "Encaissement_importKey_key" ON "Encaissement"("importKey")`);
    await this.run(`CREATE UNIQUE INDEX IF NOT EXISTS "ParametreCommission_typeCommission_key" ON "ParametreCommission"("typeCommission")`);
  }
}
