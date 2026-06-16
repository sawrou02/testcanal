import { PrismaClient, PDVType, AbonneStatut, NatureEncaissement, ModePaiement, VersementStatut, BanqueType, StatutMatching, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ============================================================
  // SECTEURS
  // ============================================================
  const secteurDakarCentre = await prisma.secteur.upsert({
    where: { id: 'sect-dakar-centre' },
    update: {},
    create: { id: 'sect-dakar-centre', nom: 'Dakar Centre' },
  });

  const secteurDakarBanlieue = await prisma.secteur.upsert({
    where: { id: 'sect-dakar-banlieue' },
    update: {},
    create: { id: 'sect-dakar-banlieue', nom: 'Dakar Banlieue' },
  });

  const secteurThies = await prisma.secteur.upsert({
    where: { id: 'sect-thies' },
    update: {},
    create: { id: 'sect-thies', nom: 'Thiès' },
  });

  const secteurPetiteCote = await prisma.secteur.upsert({
    where: { id: 'sect-petite-cote' },
    update: {},
    create: { id: 'sect-petite-cote', nom: 'Petite Côte' },
  });

  const secteurNord = await prisma.secteur.upsert({
    where: { id: 'sect-nord' },
    update: {},
    create: { id: 'sect-nord', nom: 'Nord' },
  });

  const secteurSudCasamance = await prisma.secteur.upsert({
    where: { id: 'sect-sud-casamance' },
    update: {},
    create: { id: 'sect-sud-casamance', nom: 'Sud-Casamance' },
  });

  console.log('Secteurs created');

  // ============================================================
  // LOCALITES (2 per secteur = 12 total)
  // ============================================================
  const locPlateau = await prisma.localite.upsert({
    where: { id: 'loc-plateau' },
    update: {},
    create: { id: 'loc-plateau', nom: 'Plateau', secteurId: secteurDakarCentre.id },
  });

  const locMedina = await prisma.localite.upsert({
    where: { id: 'loc-medina' },
    update: {},
    create: { id: 'loc-medina', nom: 'Médina', secteurId: secteurDakarCentre.id },
  });

  const locPikine = await prisma.localite.upsert({
    where: { id: 'loc-pikine' },
    update: {},
    create: { id: 'loc-pikine', nom: 'Pikine', secteurId: secteurDakarBanlieue.id },
  });

  const locGuediawaye = await prisma.localite.upsert({
    where: { id: 'loc-guediawaye' },
    update: {},
    create: { id: 'loc-guediawaye', nom: 'Guédiawaye', secteurId: secteurDakarBanlieue.id },
  });

  const locThiesVille = await prisma.localite.upsert({
    where: { id: 'loc-thies-ville' },
    update: {},
    create: { id: 'loc-thies-ville', nom: 'Thiès Ville', secteurId: secteurThies.id },
  });

  const locMbour = await prisma.localite.upsert({
    where: { id: 'loc-mbour' },
    update: {},
    create: { id: 'loc-mbour', nom: 'Mbour', secteurId: secteurThies.id },
  });

  const locSaly = await prisma.localite.upsert({
    where: { id: 'loc-saly' },
    update: {},
    create: { id: 'loc-saly', nom: 'Saly', secteurId: secteurPetiteCote.id },
  });

  const locJoal = await prisma.localite.upsert({
    where: { id: 'loc-joal' },
    update: {},
    create: { id: 'loc-joal', nom: 'Joal', secteurId: secteurPetiteCote.id },
  });

  const locSaintLouis = await prisma.localite.upsert({
    where: { id: 'loc-saint-louis' },
    update: {},
    create: { id: 'loc-saint-louis', nom: 'Saint-Louis', secteurId: secteurNord.id },
  });

  const locLouga = await prisma.localite.upsert({
    where: { id: 'loc-louga' },
    update: {},
    create: { id: 'loc-louga', nom: 'Louga', secteurId: secteurNord.id },
  });

  const locZiguinchor = await prisma.localite.upsert({
    where: { id: 'loc-ziguinchor' },
    update: {},
    create: { id: 'loc-ziguinchor', nom: 'Ziguinchor', secteurId: secteurSudCasamance.id },
  });

  const locBignona = await prisma.localite.upsert({
    where: { id: 'loc-bignona' },
    update: {},
    create: { id: 'loc-bignona', nom: 'Bignona', secteurId: secteurSudCasamance.id },
  });

  console.log('Localités created');

  // ============================================================
  // FORMULES
  // ============================================================
  const formuleAccess = await prisma.formule.upsert({
    where: { code: 'ACCESS' },
    update: {},
    create: {
      id: 'form-access',
      code: 'ACCESS',
      nomCommercial: 'ACCESS',
      prixMateriel: 5000,
      prixFormule: 1500,
    },
  });

  const formuleEvasion = await prisma.formule.upsert({
    where: { code: 'EVASION' },
    update: {},
    create: {
      id: 'form-evasion',
      code: 'EVASION',
      nomCommercial: 'EVASION',
      prixMateriel: 10000,
      prixFormule: 3000,
    },
  });

  const formuleEvasionPlus = await prisma.formule.upsert({
    where: { code: 'EVASION_PLUS' },
    update: {},
    create: {
      id: 'form-evasion-plus',
      code: 'EVASION_PLUS',
      nomCommercial: 'EVASION+',
      prixMateriel: 15000,
      prixFormule: 4500,
    },
  });

  const formuleToutCanal = await prisma.formule.upsert({
    where: { code: 'TOUT_CANAL' },
    update: {},
    create: {
      id: 'form-tout-canal',
      code: 'TOUT_CANAL',
      nomCommercial: 'TOUT CANAL',
      prixMateriel: 20000,
      prixFormule: 6000,
    },
  });

  const formulePrestige = await prisma.formule.upsert({
    where: { code: 'PRESTIGE' },
    update: {},
    create: {
      id: 'form-prestige',
      code: 'PRESTIGE',
      nomCommercial: 'PRESTIGE',
      prixMateriel: 30000,
      prixFormule: 9000,
    },
  });

  console.log('Formules created');

  // ============================================================
  // PDVs (12 total, spread across types)
  // ============================================================
  const pdv1 = await prisma.pDV.upsert({
    where: { code: 'PDV-DKC-001' },
    update: {},
    create: {
      id: 'pdv-001',
      code: 'PDV-DKC-001',
      raisonSociale: 'Boutique Centrale Dakar',
      type: PDVType.BOUTIQUE_PROPRE,
      secteurId: secteurDakarCentre.id,
      localiteId: locPlateau.id,
      caution: 500000,
      soldeActuel: 250000,
    },
  });

  const pdv2 = await prisma.pDV.upsert({
    where: { code: 'PDV-DKC-002' },
    update: {},
    create: {
      id: 'pdv-002',
      code: 'PDV-DKC-002',
      raisonSociale: 'Agence Médina',
      type: PDVType.AGENCE_PRINCIPALE,
      secteurId: secteurDakarCentre.id,
      localiteId: locMedina.id,
      caution: 300000,
      soldeActuel: 120000,
    },
  });

  const pdv3 = await prisma.pDV.upsert({
    where: { code: 'PDV-DKB-001' },
    update: {},
    create: {
      id: 'pdv-003',
      code: 'PDV-DKB-001',
      raisonSociale: 'Réseau Pikine Nord',
      type: PDVType.SOUS_RESEAU,
      secteurId: secteurDakarBanlieue.id,
      localiteId: locPikine.id,
      caution: 200000,
      soldeActuel: 80000,
    },
  });

  const pdv4 = await prisma.pDV.upsert({
    where: { code: 'PDV-DKB-002' },
    update: {},
    create: {
      id: 'pdv-004',
      code: 'PDV-DKB-002',
      raisonSociale: 'Point Vente Guédiawaye',
      type: PDVType.VAD,
      secteurId: secteurDakarBanlieue.id,
      localiteId: locGuediawaye.id,
      caution: 150000,
      soldeActuel: 60000,
    },
  });

  const pdv5 = await prisma.pDV.upsert({
    where: { code: 'PDV-THS-001' },
    update: {},
    create: {
      id: 'pdv-005',
      code: 'PDV-THS-001',
      raisonSociale: 'Boutique Thiès Centre',
      type: PDVType.BOUTIQUE_PROPRE,
      secteurId: secteurThies.id,
      localiteId: locThiesVille.id,
      caution: 400000,
      soldeActuel: 180000,
    },
  });

  const pdv6 = await prisma.pDV.upsert({
    where: { code: 'PDV-THS-002' },
    update: {},
    create: {
      id: 'pdv-006',
      code: 'PDV-THS-002',
      raisonSociale: 'Apporteur Mbour',
      type: PDVType.APPORTEUR,
      secteurId: secteurThies.id,
      localiteId: locMbour.id,
      caution: 100000,
      soldeActuel: 40000,
    },
  });

  const pdv7 = await prisma.pDV.upsert({
    where: { code: 'PDV-PC-001' },
    update: {},
    create: {
      id: 'pdv-007',
      code: 'PDV-PC-001',
      raisonSociale: 'Boutique Saly Portudal',
      type: PDVType.BOUTIQUE_PROPRE,
      secteurId: secteurPetiteCote.id,
      localiteId: locSaly.id,
      caution: 350000,
      soldeActuel: 160000,
    },
  });

  const pdv8 = await prisma.pDV.upsert({
    where: { code: 'PDV-PC-002' },
    update: {},
    create: {
      id: 'pdv-008',
      code: 'PDV-PC-002',
      raisonSociale: 'Réseau Joal Fadiouth',
      type: PDVType.SOUS_RESEAU,
      secteurId: secteurPetiteCote.id,
      localiteId: locJoal.id,
      caution: 120000,
      soldeActuel: 50000,
    },
  });

  const pdv9 = await prisma.pDV.upsert({
    where: { code: 'PDV-NRD-001' },
    update: {},
    create: {
      id: 'pdv-009',
      code: 'PDV-NRD-001',
      raisonSociale: 'Agence Saint-Louis',
      type: PDVType.AGENCE_PRINCIPALE,
      secteurId: secteurNord.id,
      localiteId: locSaintLouis.id,
      caution: 450000,
      soldeActuel: 200000,
    },
  });

  const pdv10 = await prisma.pDV.upsert({
    where: { code: 'PDV-NRD-002' },
    update: {},
    create: {
      id: 'pdv-010',
      code: 'PDV-NRD-002',
      raisonSociale: 'Point Vente Louga',
      type: PDVType.VAD,
      secteurId: secteurNord.id,
      localiteId: locLouga.id,
      caution: 80000,
      soldeActuel: 35000,
    },
  });

  const pdv11 = await prisma.pDV.upsert({
    where: { code: 'PDV-CAS-001' },
    update: {},
    create: {
      id: 'pdv-011',
      code: 'PDV-CAS-001',
      raisonSociale: 'Boutique Ziguinchor',
      type: PDVType.BOUTIQUE_PROPRE,
      secteurId: secteurSudCasamance.id,
      localiteId: locZiguinchor.id,
      caution: 300000,
      soldeActuel: 130000,
    },
  });

  const pdv12 = await prisma.pDV.upsert({
    where: { code: 'PDV-CAS-002' },
    update: {},
    create: {
      id: 'pdv-012',
      code: 'PDV-CAS-002',
      raisonSociale: 'Apporteur Bignona',
      type: PDVType.APPORTEUR,
      secteurId: secteurSudCasamance.id,
      localiteId: locBignona.id,
      caution: 70000,
      soldeActuel: 28000,
    },
  });

  console.log('PDVs created');

  // ============================================================
  // BANQUES (5 total)
  // ============================================================
  const banque1 = await prisma.banque.upsert({
    where: { id: 'bank-001' },
    update: {},
    create: {
      id: 'bank-001',
      nom: 'CBAO Sénégal',
      numCompte: 'SN011 00100 10000123456 78',
      type: BanqueType.BANQUE,
      soldeActuel: 15000000,
    },
  });

  const banque2 = await prisma.banque.upsert({
    where: { id: 'bank-002' },
    update: {},
    create: {
      id: 'bank-002',
      nom: 'Ecobank Sénégal',
      numCompte: 'SN021 00200 20000234567 89',
      type: BanqueType.BANQUE,
      soldeActuel: 8500000,
    },
  });

  const banque3 = await prisma.banque.upsert({
    where: { id: 'bank-003' },
    update: {},
    create: {
      id: 'bank-003',
      nom: 'Wave Sénégal',
      numCompte: 'WAVE-SENDISTRI-001',
      type: BanqueType.WAVE,
      soldeActuel: 3200000,
    },
  });

  const banque4 = await prisma.banque.upsert({
    where: { id: 'bank-004' },
    update: {},
    create: {
      id: 'bank-004',
      nom: 'Orange Money',
      numCompte: 'OM-SENDISTRI-001',
      type: BanqueType.MOBILE_MONEY,
      soldeActuel: 1800000,
    },
  });

  const banque5 = await prisma.banque.upsert({
    where: { id: 'bank-005' },
    update: {},
    create: {
      id: 'bank-005',
      nom: 'BIS Banque',
      numCompte: 'SN031 00300 30000345678 90',
      type: BanqueType.BANQUE,
      soldeActuel: 22000000,
    },
  });

  console.log('Banques created');

  // ============================================================
  // USERS (7 total, one per role)
  // ============================================================
  const passwordHash = await bcrypt.hash('Demo123!', 10);

  const userSuperAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@sendistri.sn' },
    update: {},
    create: {
      id: 'user-super-admin',
      nom: 'Diallo',
      prenom: 'Mamadou',
      email: 'superadmin@sendistri.sn',
      passwordHash,
      role: 'SUPER_ADMIN',
      statut: 'ACTIF',
    },
  });

  const userAdmin = await prisma.user.upsert({
    where: { email: 'admin@sendistri.sn' },
    update: {},
    create: {
      id: 'user-admin',
      nom: 'Ndiaye',
      prenom: 'Fatou',
      email: 'admin@sendistri.sn',
      passwordHash,
      role: 'ADMIN',
      statut: 'ACTIF',
    },
  });

  const userManager = await prisma.user.upsert({
    where: { email: 'manager@sendistri.sn' },
    update: {},
    create: {
      id: 'user-manager',
      nom: 'Sow',
      prenom: 'Ibrahima',
      email: 'manager@sendistri.sn',
      passwordHash,
      role: 'MANAGER',
      pdvId: pdv1.id,
      statut: 'ACTIF',
    },
  });

  const userComptable = await prisma.user.upsert({
    where: { email: 'comptable@sendistri.sn' },
    update: {},
    create: {
      id: 'user-comptable',
      nom: 'Ba',
      prenom: 'Aminata',
      email: 'comptable@sendistri.sn',
      passwordHash,
      role: 'COMPTABLE',
      statut: 'ACTIF',
    },
  });

  const userLogisticien = await prisma.user.upsert({
    where: { email: 'logisticien@sendistri.sn' },
    update: {},
    create: {
      id: 'user-logisticien',
      nom: 'Cisse',
      prenom: 'Ousmane',
      email: 'logisticien@sendistri.sn',
      passwordHash,
      role: 'LOGISTICIEN',
      statut: 'ACTIF',
    },
  });

  const userCommercial = await prisma.user.upsert({
    where: { email: 'commercial@sendistri.sn' },
    update: {},
    create: {
      id: 'user-commercial',
      nom: 'Sarr',
      prenom: 'Mariama',
      email: 'commercial@sendistri.sn',
      passwordHash,
      role: 'COMMERCIAL',
      pdvId: pdv2.id,
      statut: 'ACTIF',
    },
  });

  const userVendeur = await prisma.user.upsert({
    where: { email: 'vendeur@sendistri.sn' },
    update: {},
    create: {
      id: 'user-vendeur',
      nom: 'Fall',
      prenom: 'Cheikh',
      email: 'vendeur@sendistri.sn',
      passwordHash,
      role: 'VENDEUR',
      pdvId: pdv1.id,
      statut: 'ACTIF',
    },
  });

  console.log('Users created');

  // ============================================================
  // ABONNES (15 total with realistic Senegalese names)
  // ============================================================
  const abonne1 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-001' },
    update: {},
    create: {
      id: 'abn-001',
      numAbonne: 'ABN-2024-001',
      nom: 'Diallo',
      prenom: 'Moussa',
      tel1: '77 123 45 67',
      tel2: '70 987 65 43',
      formuleId: formuleAccess.id,
      pdvId: pdv1.id,
      dateEcheance: new Date('2025-03-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'PDV',
    },
  });

  const abonne2 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-002' },
    update: {},
    create: {
      id: 'abn-002',
      numAbonne: 'ABN-2024-002',
      nom: 'Ndiaye',
      prenom: 'Aissatou',
      tel1: '76 234 56 78',
      formuleId: formuleEvasion.id,
      pdvId: pdv1.id,
      dateEcheance: new Date('2025-06-30'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'WAVE',
    },
  });

  const abonne3 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-003' },
    update: {},
    create: {
      id: 'abn-003',
      numAbonne: 'ABN-2024-003',
      nom: 'Sow',
      prenom: 'Abdoulaye',
      tel1: '78 345 67 89',
      formuleId: formuleEvasionPlus.id,
      pdvId: pdv2.id,
      dateEcheance: new Date('2025-02-28'),
      statut: AbonneStatut.ECHU,
      canalReabo: 'PDV',
    },
  });

  const abonne4 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-004' },
    update: {},
    create: {
      id: 'abn-004',
      numAbonne: 'ABN-2024-004',
      nom: 'Ba',
      prenom: 'Rokhaya',
      tel1: '77 456 78 90',
      formuleId: formuleToutCanal.id,
      pdvId: pdv3.id,
      dateEcheance: new Date('2025-12-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'ORANGE_MONEY',
    },
  });

  const abonne5 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-005' },
    update: {},
    create: {
      id: 'abn-005',
      numAbonne: 'ABN-2024-005',
      nom: 'Cisse',
      prenom: 'Seydou',
      tel1: '70 567 89 01',
      formuleId: formulePrestige.id,
      pdvId: pdv3.id,
      dateEcheance: new Date('2025-09-30'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'PDV',
    },
  });

  const abonne6 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-006' },
    update: {},
    create: {
      id: 'abn-006',
      numAbonne: 'ABN-2024-006',
      nom: 'Sarr',
      prenom: 'Mame Diarra',
      tel1: '76 678 90 12',
      formuleId: formuleAccess.id,
      pdvId: pdv4.id,
      dateEcheance: new Date('2025-04-30'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'PDV',
    },
  });

  const abonne7 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-007' },
    update: {},
    create: {
      id: 'abn-007',
      numAbonne: 'ABN-2024-007',
      nom: 'Fall',
      prenom: 'Pape',
      tel1: '78 789 01 23',
      formuleId: formuleEvasion.id,
      pdvId: pdv5.id,
      dateEcheance: new Date('2025-07-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'WAVE',
    },
  });

  const abonne8 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-008' },
    update: {},
    create: {
      id: 'abn-008',
      numAbonne: 'ABN-2024-008',
      nom: 'Toure',
      prenom: 'Khadija',
      tel1: '77 890 12 34',
      formuleId: formuleEvasionPlus.id,
      pdvId: pdv5.id,
      dateEcheance: new Date('2024-12-31'),
      statut: AbonneStatut.SUSPENDU,
      canalReabo: 'PDV',
    },
  });

  const abonne9 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-009' },
    update: {},
    create: {
      id: 'abn-009',
      numAbonne: 'ABN-2024-009',
      nom: 'Diop',
      prenom: 'Malick',
      tel1: '70 901 23 45',
      formuleId: formuleToutCanal.id,
      pdvId: pdv6.id,
      dateEcheance: new Date('2025-08-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'PDV',
    },
  });

  const abonne10 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-010' },
    update: {},
    create: {
      id: 'abn-010',
      numAbonne: 'ABN-2024-010',
      nom: 'Gueye',
      prenom: 'Ndéye',
      tel1: '76 012 34 56',
      formuleId: formuleAccess.id,
      pdvId: pdv7.id,
      dateEcheance: new Date('2025-05-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'ORANGE_MONEY',
    },
  });

  const abonne11 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-011' },
    update: {},
    create: {
      id: 'abn-011',
      numAbonne: 'ABN-2024-011',
      nom: 'Mbaye',
      prenom: 'Birame',
      tel1: '78 123 45 60',
      formuleId: formulePrestige.id,
      pdvId: pdv8.id,
      dateEcheance: new Date('2026-01-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'PDV',
    },
  });

  const abonne12 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-012' },
    update: {},
    create: {
      id: 'abn-012',
      numAbonne: 'ABN-2024-012',
      nom: 'Sy',
      prenom: 'Oumar',
      tel1: '77 234 56 01',
      formuleId: formuleEvasion.id,
      pdvId: pdv9.id,
      dateEcheance: new Date('2025-10-31'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'WAVE',
    },
  });

  const abonne13 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-013' },
    update: {},
    create: {
      id: 'abn-013',
      numAbonne: 'ABN-2024-013',
      nom: 'Kane',
      prenom: 'Adja',
      tel1: '70 345 67 02',
      formuleId: formuleEvasionPlus.id,
      pdvId: pdv10.id,
      dateEcheance: new Date('2025-11-30'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'PDV',
    },
  });

  const abonne14 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-014' },
    update: {},
    create: {
      id: 'abn-014',
      numAbonne: 'ABN-2024-014',
      nom: 'Diouf',
      prenom: 'Serigne',
      tel1: '76 456 78 03',
      formuleId: formuleToutCanal.id,
      pdvId: pdv11.id,
      dateEcheance: new Date('2025-06-30'),
      statut: AbonneStatut.ACTIF,
      canalReabo: 'ORANGE_MONEY',
    },
  });

  const abonne15 = await prisma.abonne.upsert({
    where: { numAbonne: 'ABN-2024-015' },
    update: {},
    create: {
      id: 'abn-015',
      numAbonne: 'ABN-2024-015',
      nom: 'Badji',
      prenom: 'Celestine',
      tel1: '78 567 89 04',
      formuleId: formuleAccess.id,
      pdvId: pdv12.id,
      dateEcheance: new Date('2024-11-30'),
      statut: AbonneStatut.RESILIE,
      canalReabo: 'PDV',
    },
  });

  console.log('Abonnés created');

  // ============================================================
  // ENCAISSEMENTS (20 total)
  // ============================================================
  const encaissementsData = [
    {
      id: 'enc-001',
      abonneId: abonne1.id,
      pdvId: pdv1.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleAccess.id,
      nbMois: 3,
      montantTotal: 4500,
      montantRecu: 4500,
      modePaiement: ModePaiement.ESPECE,
      date: new Date('2024-01-15'),
      recuNumero: 'REC-2024-001',
    },
    {
      id: 'enc-002',
      abonneId: abonne2.id,
      pdvId: pdv1.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.RECRUTEMENT,
      formuleId: formuleEvasion.id,
      nbMois: 6,
      montantTotal: 28000,
      montantRecu: 28000,
      modePaiement: ModePaiement.WAVE,
      date: new Date('2024-01-20'),
      recuNumero: 'REC-2024-002',
    },
    {
      id: 'enc-003',
      abonneId: abonne3.id,
      pdvId: pdv2.id,
      userId: userCommercial.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleEvasionPlus.id,
      nbMois: 1,
      montantTotal: 4500,
      montantRecu: 4500,
      modePaiement: ModePaiement.ORANGE_MONEY,
      date: new Date('2024-02-01'),
      recuNumero: 'REC-2024-003',
    },
    {
      id: 'enc-004',
      abonneId: abonne4.id,
      pdvId: pdv3.id,
      userId: userManager.id,
      nature: NatureEncaissement.RECRUTEMENT,
      formuleId: formuleToutCanal.id,
      nbMois: 12,
      montantTotal: 92000,
      montantRecu: 92000,
      modePaiement: ModePaiement.CHEQUE,
      date: new Date('2024-02-10'),
      recuNumero: 'REC-2024-004',
    },
    {
      id: 'enc-005',
      abonneId: abonne5.id,
      pdvId: pdv3.id,
      userId: userManager.id,
      nature: NatureEncaissement.RECRUTEMENT,
      formuleId: formulePrestige.id,
      nbMois: 6,
      montantTotal: 84000,
      montantRecu: 84000,
      modePaiement: ModePaiement.VIREMENT,
      date: new Date('2024-03-05'),
      recuNumero: 'REC-2024-005',
    },
    {
      id: 'enc-006',
      abonneId: abonne6.id,
      pdvId: pdv4.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleAccess.id,
      nbMois: 3,
      montantTotal: 4500,
      montantRecu: 4500,
      modePaiement: ModePaiement.ESPECE,
      date: new Date('2024-03-15'),
      recuNumero: 'REC-2024-006',
    },
    {
      id: 'enc-007',
      abonneId: abonne7.id,
      pdvId: pdv5.id,
      userId: userCommercial.id,
      nature: NatureEncaissement.MIGRATION,
      formuleId: formuleEvasion.id,
      nbMois: 1,
      montantTotal: 3000,
      montantRecu: 3000,
      modePaiement: ModePaiement.WAVE,
      date: new Date('2024-04-01'),
      recuNumero: 'REC-2024-007',
    },
    {
      id: 'enc-008',
      abonneId: abonne8.id,
      pdvId: pdv5.id,
      userId: userCommercial.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleEvasionPlus.id,
      nbMois: 6,
      montantTotal: 27000,
      montantRecu: 27000,
      modePaiement: ModePaiement.ORANGE_MONEY,
      date: new Date('2024-04-15'),
      recuNumero: 'REC-2024-008',
    },
    {
      id: 'enc-009',
      abonneId: abonne9.id,
      pdvId: pdv6.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.RECRUTEMENT,
      formuleId: formuleToutCanal.id,
      nbMois: 3,
      montantTotal: 38000,
      montantRecu: 38000,
      modePaiement: ModePaiement.ESPECE,
      date: new Date('2024-05-10'),
      recuNumero: 'REC-2024-009',
    },
    {
      id: 'enc-010',
      abonneId: abonne10.id,
      pdvId: pdv7.id,
      userId: userManager.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleAccess.id,
      nbMois: 12,
      montantTotal: 18000,
      montantRecu: 18000,
      modePaiement: ModePaiement.CHEQUE,
      date: new Date('2024-05-20'),
      recuNumero: 'REC-2024-010',
    },
    {
      id: 'enc-011',
      abonneId: abonne11.id,
      pdvId: pdv8.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.RECRUTEMENT,
      formuleId: formulePrestige.id,
      nbMois: 12,
      montantTotal: 138000,
      montantRecu: 138000,
      modePaiement: ModePaiement.VIREMENT,
      date: new Date('2024-06-01'),
      recuNumero: 'REC-2024-011',
    },
    {
      id: 'enc-012',
      abonneId: abonne12.id,
      pdvId: pdv9.id,
      userId: userCommercial.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleEvasion.id,
      nbMois: 3,
      montantTotal: 9000,
      montantRecu: 9000,
      modePaiement: ModePaiement.WAVE,
      date: new Date('2024-06-15'),
      recuNumero: 'REC-2024-012',
    },
    {
      id: 'enc-013',
      abonneId: abonne13.id,
      pdvId: pdv10.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.MIGRATION,
      formuleId: formuleEvasionPlus.id,
      nbMois: 1,
      montantTotal: 4500,
      montantRecu: 4500,
      modePaiement: ModePaiement.ESPECE,
      date: new Date('2024-07-05'),
      recuNumero: 'REC-2024-013',
    },
    {
      id: 'enc-014',
      abonneId: abonne14.id,
      pdvId: pdv11.id,
      userId: userManager.id,
      nature: NatureEncaissement.RECRUTEMENT,
      formuleId: formuleToutCanal.id,
      nbMois: 6,
      montantTotal: 56000,
      montantRecu: 56000,
      modePaiement: ModePaiement.ORANGE_MONEY,
      date: new Date('2024-07-20'),
      recuNumero: 'REC-2024-014',
    },
    {
      id: 'enc-015',
      abonneId: abonne1.id,
      pdvId: pdv1.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleAccess.id,
      nbMois: 6,
      montantTotal: 9000,
      montantRecu: 9000,
      modePaiement: ModePaiement.WAVE,
      date: new Date('2024-08-01'),
      recuNumero: 'REC-2024-015',
    },
    {
      id: 'enc-016',
      abonneId: abonne2.id,
      pdvId: pdv1.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleEvasion.id,
      nbMois: 3,
      montantTotal: 9000,
      montantRecu: 9000,
      modePaiement: ModePaiement.ESPECE,
      date: new Date('2024-08-15'),
      recuNumero: 'REC-2024-016',
    },
    {
      id: 'enc-017',
      abonneId: abonne4.id,
      pdvId: pdv3.id,
      userId: userManager.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleToutCanal.id,
      nbMois: 6,
      montantTotal: 36000,
      montantRecu: 36000,
      modePaiement: ModePaiement.CHEQUE,
      date: new Date('2024-09-10'),
      recuNumero: 'REC-2024-017',
    },
    {
      id: 'enc-018',
      abonneId: abonne7.id,
      pdvId: pdv5.id,
      userId: userCommercial.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleEvasion.id,
      nbMois: 6,
      montantTotal: 18000,
      montantRecu: 18000,
      modePaiement: ModePaiement.WAVE,
      date: new Date('2024-10-01'),
      recuNumero: 'REC-2024-018',
    },
    {
      id: 'enc-019',
      abonneId: abonne9.id,
      pdvId: pdv6.id,
      userId: userVendeur.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleToutCanal.id,
      nbMois: 3,
      montantTotal: 18000,
      montantRecu: 18000,
      modePaiement: ModePaiement.ORANGE_MONEY,
      date: new Date('2024-11-05'),
      recuNumero: 'REC-2024-019',
    },
    {
      id: 'enc-020',
      abonneId: abonne12.id,
      pdvId: pdv9.id,
      userId: userCommercial.id,
      nature: NatureEncaissement.REABONNEMENT,
      formuleId: formuleEvasion.id,
      nbMois: 6,
      montantTotal: 18000,
      montantRecu: 18000,
      modePaiement: ModePaiement.ESPECE,
      date: new Date('2024-12-01'),
      recuNumero: 'REC-2024-020',
    },
  ];

  for (const enc of encaissementsData) {
    await prisma.encaissement.upsert({
      where: { id: enc.id },
      update: {},
      create: enc,
    });
  }

  console.log('Encaissements created');

  // ============================================================
  // VERSEMENTS (10 total)
  // ============================================================
  const versementsData = [
    {
      id: 'vers-001',
      pdvId: pdv1.id,
      montant: 250000,
      banqueId: banque1.id,
      dateVersement: new Date('2024-01-31'),
      periode: 'JANVIER 2024',
      libelle: 'Versement mensuel janvier',
      numBordereau: 'BRD-2024-001',
      statut: VersementStatut.VALIDE,
      valideParId: userComptable.id,
    },
    {
      id: 'vers-002',
      pdvId: pdv2.id,
      montant: 120000,
      banqueId: banque1.id,
      dateVersement: new Date('2024-01-31'),
      periode: 'JANVIER 2024',
      libelle: 'Versement mensuel janvier',
      numBordereau: 'BRD-2024-002',
      statut: VersementStatut.VALIDE,
      valideParId: userComptable.id,
    },
    {
      id: 'vers-003',
      pdvId: pdv3.id,
      montant: 80000,
      banqueId: banque2.id,
      dateVersement: new Date('2024-02-29'),
      periode: 'FEVRIER 2024',
      libelle: 'Versement mensuel février',
      numBordereau: 'BRD-2024-003',
      statut: VersementStatut.VALIDE,
      valideParId: userComptable.id,
    },
    {
      id: 'vers-004',
      pdvId: pdv5.id,
      montant: 180000,
      banqueId: banque2.id,
      dateVersement: new Date('2024-03-31'),
      periode: 'MARS 2024',
      libelle: 'Versement mensuel mars',
      numBordereau: 'BRD-2024-004',
      statut: VersementStatut.VALIDE,
      valideParId: userComptable.id,
    },
    {
      id: 'vers-005',
      pdvId: pdv7.id,
      montant: 160000,
      banqueId: banque3.id,
      dateVersement: new Date('2024-04-30'),
      periode: 'AVRIL 2024',
      libelle: 'Versement mensuel avril',
      numBordereau: 'BRD-2024-005',
      statut: VersementStatut.VALIDE,
      valideParId: userComptable.id,
    },
    {
      id: 'vers-006',
      pdvId: pdv9.id,
      montant: 200000,
      banqueId: banque1.id,
      dateVersement: new Date('2024-05-31'),
      periode: 'MAI 2024',
      libelle: 'Versement mensuel mai',
      numBordereau: 'BRD-2024-006',
      statut: VersementStatut.REJETE,
      motifRejet: 'Montant ne correspond pas aux encaissements déclarés',
      valideParId: userComptable.id,
    },
    {
      id: 'vers-007',
      pdvId: pdv11.id,
      montant: 130000,
      banqueId: banque5.id,
      dateVersement: new Date('2024-06-30'),
      periode: 'JUIN 2024',
      libelle: 'Versement mensuel juin',
      numBordereau: 'BRD-2024-007',
      statut: VersementStatut.VALIDE,
      valideParId: userComptable.id,
    },
    {
      id: 'vers-008',
      pdvId: pdv1.id,
      montant: 300000,
      banqueId: banque1.id,
      dateVersement: new Date('2024-09-30'),
      periode: 'SEPTEMBRE 2024',
      libelle: 'Versement mensuel septembre',
      numBordereau: 'BRD-2024-008',
      statut: VersementStatut.ENATTENTE,
    },
    {
      id: 'vers-009',
      pdvId: pdv4.id,
      montant: 60000,
      banqueId: banque4.id,
      dateVersement: new Date('2024-10-31'),
      periode: 'OCTOBRE 2024',
      libelle: 'Versement mensuel octobre',
      numBordereau: 'BRD-2024-009',
      statut: VersementStatut.ENATTENTE,
    },
    {
      id: 'vers-010',
      pdvId: pdv6.id,
      montant: 40000,
      banqueId: banque3.id,
      dateVersement: new Date('2024-11-30'),
      periode: 'NOVEMBRE 2024',
      libelle: 'Versement mensuel novembre',
      numBordereau: 'BRD-2024-010',
      statut: VersementStatut.ENATTENTE,
    },
  ];

  for (const vers of versementsData) {
    await prisma.versement.upsert({
      where: { id: vers.id },
      update: {},
      create: vers,
    });
  }

  console.log('Versements created');

  // ============================================================
  // RAPPORT ACTIVITES (3 total)
  // ============================================================
  const rapportsData = [
    {
      id: 'rap-001',
      date: new Date('2024-01-31'),
      fichierImporte: 'rapport_janvier_2024.xlsx',
      montantTotal: 2500000,
      sat: 1800000,
      fibre: 400000,
      rex: 300000,
      nbReabo: 145,
      caReabo: 580000,
      nbRecru: 32,
      caFormule: 960000,
      caCreatZ4: 320000,
      caCreatGZ: 180000,
      caCreatG11: 120000,
      caPayech: 240000,
      caAccessoires: 100000,
      statutMatching: StatutMatching.MATCHE,
      importeParId: userAdmin.id,
      importeLe: new Date('2024-02-03'),
    },
    {
      id: 'rap-002',
      date: new Date('2024-02-29'),
      fichierImporte: 'rapport_fevrier_2024.xlsx',
      montantTotal: 2800000,
      sat: 2000000,
      fibre: 450000,
      rex: 350000,
      nbReabo: 162,
      caReabo: 648000,
      nbRecru: 38,
      caFormule: 1140000,
      caCreatZ4: 380000,
      caCreatGZ: 210000,
      caCreatG11: 140000,
      caPayech: 285000,
      caAccessoires: 147000,
      statutMatching: StatutMatching.ECART,
      importeParId: userAdmin.id,
      importeLe: new Date('2024-03-04'),
    },
    {
      id: 'rap-003',
      date: new Date('2024-03-31'),
      fichierImporte: 'rapport_mars_2024.xlsx',
      montantTotal: 3200000,
      sat: 2200000,
      fibre: 600000,
      rex: 400000,
      nbReabo: 189,
      caReabo: 756000,
      nbRecru: 45,
      caFormule: 1350000,
      caCreatZ4: 450000,
      caCreatGZ: 250000,
      caCreatG11: 160000,
      caPayech: 338000,
      caAccessoires: 196000,
      statutMatching: StatutMatching.EN_ATTENTE,
      importeParId: userAdmin.id,
      importeLe: new Date('2024-04-02'),
    },
  ];

  for (const rap of rapportsData) {
    await prisma.rapportActivite.upsert({
      where: { id: rap.id },
      update: {},
      create: rap,
    });
  }

  console.log('Rapports created');

  // ============================================================
  // NOTIFICATIONS (5 total)
  // ============================================================
  const notificationsData = [
    {
      id: 'notif-001',
      type: NotificationType.WARN,
      message: '15 abonnés arrivent à échéance dans les 7 prochains jours',
      lien: '/abonnes?statut=ECHU',
      lu: false,
      dismissed: false,
    },
    {
      id: 'notif-002',
      type: NotificationType.URGENT,
      message: 'Versement BRD-2024-009 en attente de validation depuis 5 jours',
      lien: '/versements?statut=ENATTENTE',
      lu: false,
      dismissed: false,
    },
    {
      id: 'notif-003',
      type: NotificationType.OK,
      message: 'Rapport activité janvier 2024 validé avec succès',
      lien: '/rapports/rap-001',
      lu: true,
      dismissed: false,
    },
    {
      id: 'notif-004',
      type: NotificationType.WARN,
      message: 'Stock décodeurs Z4 en dessous du seuil minimum au PDV Pikine',
      lien: '/stock/decodeurs',
      lu: false,
      dismissed: false,
    },
    {
      id: 'notif-005',
      type: NotificationType.URGENT,
      message: 'Versement PDV-NRD-001 rejeté: écart de 25 000 XOF avec le relevé bancaire',
      lien: '/versements/vers-006',
      lu: false,
      dismissed: false,
    },
  ];

  for (const notif of notificationsData) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: {},
      create: notif,
    });
  }

  console.log('Notifications created');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('Test accounts (password: Demo123!):');
  console.log('  superadmin@sendistri.sn - SUPER_ADMIN');
  console.log('  admin@sendistri.sn      - ADMIN');
  console.log('  manager@sendistri.sn    - MANAGER');
  console.log('  comptable@sendistri.sn  - COMPTABLE');
  console.log('  logisticien@sendistri.sn - LOGISTICIEN');
  console.log('  commercial@sendistri.sn - COMMERCIAL');
  console.log('  vendeur@sendistri.sn    - VENDEUR');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
