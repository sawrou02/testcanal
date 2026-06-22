-- CreateTable
CREATE TABLE "RetourRpe" (
    "id" TEXT NOT NULL,
    "numAbonne" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "tel" TEXT,
    "formule" TEXT,
    "pdv" TEXT,
    "agent" TEXT,
    "joint" TEXT NOT NULL DEFAULT '',
    "installation" TEXT NOT NULL DEFAULT '',
    "satisfaction" TEXT NOT NULL DEFAULT '',
    "mycanal" TEXT NOT NULL DEFAULT '',
    "netflix" TEXT NOT NULL DEFAULT '',
    "progrFidel" TEXT NOT NULL DEFAULT '',
    "score" INTEGER,
    "commentaire" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetourRpe_pkey" PRIMARY KEY ("id")
);
