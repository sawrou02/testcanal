-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE', 'LOGISTICIEN', 'COMMERCIAL', 'VENDEUR');

-- CreateEnum
CREATE TYPE "Statut" AS ENUM ('ACTIF', 'INACTIF');

-- CreateEnum
CREATE TYPE "PDVType" AS ENUM ('BOUTIQUE_PROPRE', 'SOUS_RESEAU', 'AGENCE_PRINCIPALE', 'VAD', 'APPORTEUR');

-- CreateEnum
CREATE TYPE "AbonneStatut" AS ENUM ('ACTIF', 'ECHU', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "DecodeurType" AS ENUM ('Z4', 'GLOBAZ', 'G11');

-- CreateEnum
CREATE TYPE "DecodeurStatut" AS ENUM ('EN_STOCK_ENTREPOT', 'EN_STOCK_PDV', 'VENDU', 'IMMOBILISE', 'DEFECTUEUX');

-- CreateEnum
CREATE TYPE "NatureEncaissement" AS ENUM ('RECRUTEMENT', 'REABONNEMENT', 'MIGRATION');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECE', 'WAVE', 'ORANGE_MONEY', 'CHEQUE', 'VIREMENT');

-- CreateEnum
CREATE TYPE "VersementStatut" AS ENUM ('ENATTENTE', 'VALIDE', 'REJETE');

-- CreateEnum
CREATE TYPE "BanqueType" AS ENUM ('BANQUE', 'MOBILE_MONEY', 'WAVE');

-- CreateEnum
CREATE TYPE "StatutMatching" AS ENUM ('EN_ATTENTE', 'MATCHE', 'ECART');

-- CreateEnum
CREATE TYPE "EntrepotType" AS ENUM ('PRINCIPAL', 'SECONDAIRE');

-- CreateEnum
CREATE TYPE "MouvementType" AS ENUM ('EN_ENTREPOT_PDV', 'PDV_PDV', 'ENTREPOT_ENTREPOT', 'PDV_ENTREPOT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WARN', 'OK', 'URGENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "pdvId" TEXT,
    "statut" "Statut" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secteur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Secteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localite" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    CONSTRAINT "Localite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDV" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "type" "PDVType" NOT NULL,
    "secteurId" TEXT NOT NULL,
    "localiteId" TEXT NOT NULL,
    "caution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldeActuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" "Statut" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PDV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nomCommercial" TEXT NOT NULL,
    "prixMateriel" DOUBLE PRECISION NOT NULL,
    "prixFormule" DOUBLE PRECISION NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'ACTIF',

    CONSTRAINT "Formule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonne" (
    "id" TEXT NOT NULL,
    "numAbonne" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "tel1" TEXT NOT NULL,
    "tel2" TEXT,
    "formuleId" TEXT NOT NULL,
    "decodeurId" TEXT,
    "pdvId" TEXT NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "statut" "AbonneStatut" NOT NULL DEFAULT 'ACTIF',
    "canalReabo" TEXT,

    CONSTRAINT "Abonne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decodeur" (
    "id" TEXT NOT NULL,
    "numSerie" TEXT NOT NULL,
    "type" "DecodeurType" NOT NULL,
    "statut" "DecodeurStatut" NOT NULL DEFAULT 'EN_STOCK_ENTREPOT',
    "entrepotId" TEXT,
    "pdvId" TEXT,
    "dateEntree" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decodeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encaissement" (
    "id" TEXT NOT NULL,
    "abonneId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nature" "NatureEncaissement" NOT NULL,
    "formuleId" TEXT NOT NULL,
    "nbMois" INTEGER NOT NULL,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantRecu" DOUBLE PRECISION NOT NULL,
    "monnaie" TEXT NOT NULL DEFAULT 'XOF',
    "modePaiement" "ModePaiement" NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "date" TIMESTAMP(3) NOT NULL,
    "recuNumero" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encaissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banque" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "numCompte" TEXT NOT NULL,
    "type" "BanqueType" NOT NULL,
    "soldeActuel" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Banque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Versement" (
    "id" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "banqueId" TEXT NOT NULL,
    "dateVersement" TIMESTAMP(3) NOT NULL,
    "periode" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "numBordereau" TEXT NOT NULL,
    "photoBordereau" TEXT,
    "statut" "VersementStatut" NOT NULL DEFAULT 'ENATTENTE',
    "motifRejet" TEXT,
    "valideParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Versement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retrait" (
    "id" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "banqueId" TEXT NOT NULL,
    "dateVersement" TIMESTAMP(3) NOT NULL,
    "periode" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "numBordereau" TEXT NOT NULL,
    "photoBordereau" TEXT,
    "statut" "VersementStatut" NOT NULL DEFAULT 'ENATTENTE',
    "motifRejet" TEXT,
    "valideParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportActivite" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fichierImporte" TEXT NOT NULL,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "sat" DOUBLE PRECISION NOT NULL,
    "fibre" DOUBLE PRECISION NOT NULL,
    "rex" DOUBLE PRECISION NOT NULL,
    "nbReabo" INTEGER NOT NULL,
    "caReabo" DOUBLE PRECISION NOT NULL,
    "nbRecru" INTEGER NOT NULL,
    "caFormule" DOUBLE PRECISION NOT NULL,
    "caCreatZ4" DOUBLE PRECISION NOT NULL,
    "caCreatGZ" DOUBLE PRECISION NOT NULL,
    "caCreatG11" DOUBLE PRECISION NOT NULL,
    "caPayech" DOUBLE PRECISION NOT NULL,
    "caAccessoires" DOUBLE PRECISION NOT NULL,
    "statutMatching" "StatutMatching" NOT NULL DEFAULT 'EN_ATTENTE',
    "importeParId" TEXT NOT NULL,
    "importeLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RapportActivite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrepot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "EntrepotType" NOT NULL,
    "capacite" INTEGER NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'ACTIF',

    CONSTRAINT "Entrepot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "type" "MouvementType" NOT NULL,
    "materiel" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "numBonLivraison" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'ACTIF',

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "categorie" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "justificatif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objectif" (
    "id" TEXT NOT NULL,
    "pdvId" TEXT,
    "typeObjectif" TEXT NOT NULL,
    "cible" DOUBLE PRECISION NOT NULL,
    "periode" TEXT NOT NULL,

    CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accessoire" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "stockEntrepot" INTEGER NOT NULL DEFAULT 0,
    "statut" "Statut" NOT NULL DEFAULT 'ACTIF',

    CONSTRAINT "Accessoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAccessoire" (
    "id" TEXT NOT NULL,
    "accessoireId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockAccessoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteAccessoire" (
    "id" TEXT NOT NULL,
    "accessoireId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenteAccessoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetourDefectueux" (
    "id" TEXT NOT NULL,
    "accessoireId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetourDefectueux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteKit" (
    "id" TEXT NOT NULL,
    "vadPdvId" TEXT NOT NULL,
    "decodeurType" "DecodeurType" NOT NULL,
    "clientNom" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenteKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "plafond" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avoir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dette" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArreteSolde" (
    "id" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "soldeFige" DOUBLE PRECISION NOT NULL,
    "dateArrete" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'SIGNE',

    CONSTRAINT "ArreteSolde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "technicien" TEXT NOT NULL,
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateInstallation" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'DEMANDEE',

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PDV_code_key" ON "PDV"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Formule_code_key" ON "Formule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Abonne_numAbonne_key" ON "Abonne"("numAbonne");

-- CreateIndex
CREATE UNIQUE INDEX "Decodeur_numSerie_key" ON "Decodeur"("numSerie");

-- CreateIndex
CREATE UNIQUE INDEX "Entrepot_code_key" ON "Entrepot"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Accessoire_code_key" ON "Accessoire"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StockAccessoire_accessoireId_pdvId_key" ON "StockAccessoire"("accessoireId", "pdvId");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_pdvId_key" ON "Credit"("pdvId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Localite" ADD CONSTRAINT "Localite_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDV" ADD CONSTRAINT "PDV_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDV" ADD CONSTRAINT "PDV_localiteId_fkey" FOREIGN KEY ("localiteId") REFERENCES "Localite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonne" ADD CONSTRAINT "Abonne_formuleId_fkey" FOREIGN KEY ("formuleId") REFERENCES "Formule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonne" ADD CONSTRAINT "Abonne_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonne" ADD CONSTRAINT "Abonne_decodeurId_fkey" FOREIGN KEY ("decodeurId") REFERENCES "Decodeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decodeur" ADD CONSTRAINT "Decodeur_entrepotId_fkey" FOREIGN KEY ("entrepotId") REFERENCES "Entrepot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decodeur" ADD CONSTRAINT "Decodeur_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_abonneId_fkey" FOREIGN KEY ("abonneId") REFERENCES "Abonne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_formuleId_fkey" FOREIGN KEY ("formuleId") REFERENCES "Formule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versement" ADD CONSTRAINT "Versement_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versement" ADD CONSTRAINT "Versement_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retrait" ADD CONSTRAINT "Retrait_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retrait" ADD CONSTRAINT "Retrait_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportActivite" ADD CONSTRAINT "RapportActivite_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objectif" ADD CONSTRAINT "Objectif_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAccessoire" ADD CONSTRAINT "StockAccessoire_accessoireId_fkey" FOREIGN KEY ("accessoireId") REFERENCES "Accessoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAccessoire" ADD CONSTRAINT "StockAccessoire_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteAccessoire" ADD CONSTRAINT "VenteAccessoire_accessoireId_fkey" FOREIGN KEY ("accessoireId") REFERENCES "Accessoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteAccessoire" ADD CONSTRAINT "VenteAccessoire_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetourDefectueux" ADD CONSTRAINT "RetourDefectueux_accessoireId_fkey" FOREIGN KEY ("accessoireId") REFERENCES "Accessoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetourDefectueux" ADD CONSTRAINT "RetourDefectueux_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteKit" ADD CONSTRAINT "VenteKit_vadPdvId_fkey" FOREIGN KEY ("vadPdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArreteSolde" ADD CONSTRAINT "ArreteSolde_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "PDV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
