import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * Met automatiquement la base au niveau du code au démarrage.
 * Évite les erreurs « table manquante » (ConfigRegion, Message, Document…)
 * quand la mise à jour n'a pas lancé `prisma db push` manuellement.
 * Nos changements de schéma sont TOUJOURS additifs → aucune perte de données.
 */
function syncDatabaseSchema() {
  try {
    // Uniquement pour la base SQLite hors-ligne. En cloud (Postgres), le schéma
    // est appliqué au déploiement (build) → on ne relance pas db push à chaque boot.
    const url = process.env.DATABASE_URL || '';
    const isSqlite = url.startsWith('file:') || url === '' || url.includes('.db');
    if (!isSqlite) return;
    // backend/dist/src/main.js -> racine backend = ../../..
    const root = join(__dirname, '..', '..');
    const prismaCli = join(root, 'node_modules', 'prisma', 'build', 'index.js');
    const schema = join(root, 'prisma', 'schema.prisma');
    if (!existsSync(prismaCli) || !existsSync(schema)) return;
    execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--schema', schema], {
      cwd: root,
      stdio: 'pipe',
      timeout: 120000,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./sendistri.db' },
    });
    // eslint-disable-next-line no-console
    console.log('Base de données synchronisée avec le schéma.');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Synchronisation de la base impossible (poursuite du démarrage) :', (e as Error).message?.slice(0, 200));
  }
}

const DEFAULT_JWT_SECRETS = [
  'sendistri-secret',
  'sendistri-secret-key',
  'your-super-secret-jwt-key-change-in-production',
];

function checkJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isInsecure = !secret || DEFAULT_JWT_SECRETS.includes(secret);

  if (process.env.NODE_ENV === 'production') {
    if (isInsecure) {
      throw new Error(
        'JWT_SECRET must be set to a secure, non-default value in production.',
      );
    }
  } else if (isInsecure) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: JWT_SECRET is missing or using a default value. Set a secure JWT_SECRET before deploying to production.',
    );
  }
}

async function bootstrap() {
  checkJwtSecret();
  syncDatabaseSchema();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Corps volumineux acceptés (import de rapports CANAL en CSV).
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ extended: true, limit: '30mb' }));

  app.use(helmet());

  app.enableCors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SENDISTRI API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SENDISTRI API running on http://localhost:${port}`);
}
bootstrap();
