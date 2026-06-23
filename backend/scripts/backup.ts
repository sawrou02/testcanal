/**
 * Sauvegarde manuelle de la base SQLite.
 * Usage : npm run backup
 *
 * Crée une copie cohérente dans backend/backups/ (VACUUM INTO).
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const pad = (n: number) => String(n).padStart(2, '0');

async function main() {
  const url = process.env.DATABASE_URL || 'file:./sendistri.db';
  if (!url.startsWith('file:')) {
    console.log('Base non-SQLite : utilisez pg_dump côté serveur.');
    return;
  }
  let dbPath = url.slice('file:'.length);
  if (!path.isAbsolute(dbPath)) dbPath = path.join(process.cwd(), 'prisma', dbPath);
  if (!fs.existsSync(dbPath)) {
    console.error('Base introuvable :', dbPath);
    process.exit(1);
  }

  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });

  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const target = path.join(dir, `sendistri-${stamp}.db`);
  const sqlPath = target.replace(/\\/g, '/').replace(/'/g, "''");

  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath}'`);
  await prisma.$disconnect();

  console.log('✔ Sauvegarde créée :', target);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
