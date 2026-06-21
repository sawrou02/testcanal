/**
 * Seed PROPRE — catalogues de configuration uniquement, aucune donnée métier.
 *
 * Crée :
 *   - les 7 comptes de connexion (RBAC)
 *   - les référentiels de paramétrage de départ : Secteurs, Localités,
 *     Formules, Banques, Entrepôts
 *
 * Laisse VIDE toute la donnée métier : PDV, abonnés, encaissements, versements,
 * retraits, décodeurs, accessoires, VAD, objectifs, dépenses, commissions,
 * crédits, arrêtés, installations… Tu les saisis via l'interface.
 *
 * Pour repeupler avec des données de démonstration : npm run seed:demo
 */
import { PrismaClient, Role, BanqueType, EntrepotType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed propre — comptes + catalogues de config (aucune donnée métier)…');

  // ---------- Comptes de connexion ----------
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

  // ---------- Secteurs ----------
  const secteurs = [
    { id: 'sect-dakar-centre', nom: 'Dakar Centre' },
    { id: 'sect-dakar-banlieue', nom: 'Dakar Banlieue' },
    { id: 'sect-thies', nom: 'Thiès' },
    { id: 'sect-petite-cote', nom: 'Petite Côte' },
    { id: 'sect-nord', nom: 'Nord' },
    { id: 'sect-sud-casamance', nom: 'Sud-Casamance' },
  ];
  for (const s of secteurs) {
    await prisma.secteur.upsert({ where: { id: s.id }, update: { nom: s.nom }, create: s });
  }

  // ---------- Localités ----------
  const localites = [
    { id: 'loc-plateau', nom: 'Plateau', secteurId: 'sect-dakar-centre' },
    { id: 'loc-medina', nom: 'Médina', secteurId: 'sect-dakar-centre' },
    { id: 'loc-pikine', nom: 'Pikine', secteurId: 'sect-dakar-banlieue' },
    { id: 'loc-guediawaye', nom: 'Guédiawaye', secteurId: 'sect-dakar-banlieue' },
    { id: 'loc-thies-ville', nom: 'Thiès Ville', secteurId: 'sect-thies' },
    { id: 'loc-mbour', nom: 'Mbour', secteurId: 'sect-thies' },
    { id: 'loc-saly', nom: 'Saly', secteurId: 'sect-petite-cote' },
    { id: 'loc-joal', nom: 'Joal', secteurId: 'sect-petite-cote' },
    { id: 'loc-saint-louis', nom: 'Saint-Louis', secteurId: 'sect-nord' },
    { id: 'loc-louga', nom: 'Louga', secteurId: 'sect-nord' },
    { id: 'loc-ziguinchor', nom: 'Ziguinchor', secteurId: 'sect-sud-casamance' },
    { id: 'loc-bignona', nom: 'Bignona', secteurId: 'sect-sud-casamance' },
  ];
  for (const l of localites) {
    await prisma.localite.upsert({ where: { id: l.id }, update: { nom: l.nom, secteurId: l.secteurId }, create: l });
  }

  // ---------- Formules ----------
  const formules = [
    { code: 'ACCESS', nomCommercial: 'ACCESS', prixMateriel: 5000, prixFormule: 1500 },
    { code: 'EVASION', nomCommercial: 'EVASION', prixMateriel: 10000, prixFormule: 3000 },
    { code: 'EVASION_PLUS', nomCommercial: 'EVASION+', prixMateriel: 15000, prixFormule: 4500 },
    { code: 'TOUT_CANAL', nomCommercial: 'TOUT CANAL', prixMateriel: 20000, prixFormule: 6000 },
    { code: 'PRESTIGE', nomCommercial: 'PRESTIGE', prixMateriel: 30000, prixFormule: 9000 },
  ];
  for (const f of formules) {
    await prisma.formule.upsert({ where: { code: f.code }, update: f, create: f });
  }

  // ---------- Banques ----------
  const banques = [
    { id: 'banque-cbao', nom: 'CBAO Sénégal', numCompte: 'SN011 00100 10000123456 78', type: BanqueType.BANQUE },
    { id: 'banque-ecobank', nom: 'Ecobank Sénégal', numCompte: 'SN021 00200 20000234567 89', type: BanqueType.BANQUE },
    { id: 'banque-wave', nom: 'Wave Sénégal', numCompte: 'WAVE-SENDISTRI-001', type: BanqueType.WAVE },
    { id: 'banque-om', nom: 'Orange Money', numCompte: 'OM-SENDISTRI-001', type: BanqueType.MOBILE_MONEY },
    { id: 'banque-bis', nom: 'BIS Banque', numCompte: 'SN031 00300 30000345678 90', type: BanqueType.BANQUE },
  ];
  for (const b of banques) {
    await prisma.banque.upsert({ where: { id: b.id }, update: { nom: b.nom, numCompte: b.numCompte, type: b.type }, create: b });
  }

  // ---------- Entrepôts ----------
  const entrepots = [
    { id: 'ent-001', code: 'ENT-DKR-01', nom: 'Entrepôt Central Dakar', type: EntrepotType.PRINCIPAL, capacite: 5000 },
    { id: 'ent-002', code: 'ENT-THS-01', nom: 'Entrepôt Thiès', type: EntrepotType.SECONDAIRE, capacite: 2000 },
    { id: 'ent-003', code: 'ENT-ZIG-01', nom: 'Entrepôt Sud Ziguinchor', type: EntrepotType.SECONDAIRE, capacite: 1500 },
  ];
  for (const e of entrepots) {
    await prisma.entrepot.upsert({ where: { id: e.id }, update: { code: e.code, nom: e.nom, type: e.type, capacite: e.capacite }, create: e });
  }

  console.log(`✔ ${users.length} comptes`);
  console.log(`✔ ${secteurs.length} secteurs · ${localites.length} localités · ${formules.length} formules · ${banques.length} banques · ${entrepots.length} entrepôts`);
  console.log('✔ Aucune donnée métier (PDV, abonnés, encaissements… vides).');
  console.log('  Connexion : <role>@sendistri.sn · mot de passe : Demo123!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
