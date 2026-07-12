/**
 * Bascule le schéma Prisma vers PostgreSQL pour le déploiement CLOUD.
 * (La version hors-ligne Windows reste en SQLite — ce script n'est lancé
 * qu'au build cloud, jamais en local.)
 *
 * Ne modifie QUE la ligne `provider` du bloc datasource. Idempotent.
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (schema.includes('provider = "postgresql"')) {
  console.log('Schéma déjà en PostgreSQL.');
  process.exit(0);
}

schema = schema.replace(
  /datasource db \{\s*provider\s*=\s*"sqlite"/,
  'datasource db {\n  provider = "postgresql"',
);

fs.writeFileSync(schemaPath, schema);
console.log('Schéma basculé en PostgreSQL pour le déploiement cloud.');
