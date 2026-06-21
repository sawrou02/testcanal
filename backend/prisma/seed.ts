/**
 * Seed PROPRE — aucune donnée fictive.
 *
 * Crée uniquement les comptes de connexion nécessaires pour utiliser
 * l'application. Toutes les données métier (PDV, abonnés, encaissements,
 * versements, décodeurs, accessoires, VAD, objectifs, dépenses, etc.) sont
 * laissées VIDES : tu les saisis toi-même via l'interface.
 *
 * Pour repeupler avec des données de démonstration, lancer le seed démo :
 *   npm run seed:demo
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed propre — création des comptes de connexion uniquement…');

  const passwordHash = await bcrypt.hash('Demo123!', 10);

  const users = [
    { id: 'user-super-admin', email: 'superadmin@sendistri.sn', role: Role.SUPER_ADMIN, prenom: 'Super', nom: 'Admin' },
    { id: 'user-admin', email: 'admin@sendistri.sn', role: Role.ADMIN, prenom: 'Administrateur', nom: 'SENDISTRI' },
    { id: 'user-manager', email: 'manager@sendistri.sn', role: Role.MANAGER, prenom: 'Manager', nom: 'SENDISTRI' },
    { id: 'user-comptable', email: 'comptable@sendistri.sn', role: Role.COMPTABLE, prenom: 'Comptable', nom: 'SENDISTRI' },
    { id: 'user-logisticien', email: 'logisticien@sendistri.sn', role: Role.LOGISTICIEN, prenom: 'Logisticien', nom: 'SENDISTRI' },
    { id: 'user-commercial', email: 'commercial@sendistri.sn', role: Role.COMMERCIAL, prenom: 'Commercial', nom: 'SENDISTRI' },
    { id: 'user-vendeur', email: 'vendeur@sendistri.sn', role: Role.VENDEUR, prenom: 'Vendeur', nom: 'SENDISTRI' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, prenom: u.prenom, nom: u.nom },
      create: { id: u.id, email: u.email, role: u.role, prenom: u.prenom, nom: u.nom, passwordHash },
    });
  }

  console.log(`✔ ${users.length} comptes créés. Aucune donnée fictive.`);
  console.log('  Connexion : <role>@sendistri.sn · mot de passe : Demo123!');
  console.log('  (superadmin, admin, manager, comptable, logisticien, commercial, vendeur)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
