# SENDISTRI — ERP de distribution télécom

Application web de gestion commerciale pour un distributeur télécom au Sénégal
(abonnements TV/internet, décodeurs, kits, accessoires) via un réseau de points de
vente (PDV) et de vendeurs à domicile (VAD).

Interface en français, montants en FCFA, mode clair/sombre, vue mobile terrain pour
l'encaissement. 14 modules métier, multi-rôles (RBAC).

> Construit à partir du prototype de design `project/SENDISTRI.dc.html`. Le prompt de
> spécification complet est dans `project/PROMPT-Claude-Code-SENDISTRI.md`.

## Stack

| Couche | Technologies |
|--------|--------------|
| Frontend | React 18, TypeScript, Vite, React Router, Tailwind CSS, Zustand, TanStack Query, Axios |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, Passport JWT |
| Infra | Docker Compose (Postgres + API + Web) |

## Démarrage rapide (Docker)

```bash
docker-compose up
```

- Frontend : http://localhost:5173
- API : http://localhost:3000/api
- Postgres : localhost:5432 (`sendistri` / `sendistri`)

Au démarrage, l'API applique le schéma Prisma puis exécute le seed (données
sénégalaises réalistes).

## Démarrage manuel (dev)

### Backend

```bash
cd backend
cp .env.example .env          # ajuster DATABASE_URL si besoin
npm install
npx prisma generate
npx prisma migrate deploy     # crée le schéma à partir des migrations
npx prisma db seed            # seed PROPRE : comptes de connexion uniquement
npm run start:dev             # http://localhost:3000
```

> **Seed propre par défaut** : la base ne contient **aucune donnée fictive**, seulement
> les 7 comptes de connexion. Tu saisis tes vraies données via l'interface.
>
> Pour (re)mettre des **données de démonstration** sénégalaises (PDV, abonnés,
> encaissements, etc.) : `npm run seed:demo`.
>
> Pour repartir d'une base vide à tout moment : `npx prisma migrate reset` (supprime
> tout, recrée le schéma, relance le seed propre).

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Définir `VITE_API_URL` (défaut `http://localhost:3000`) si l'API tourne ailleurs.

## Comptes de démonstration

Tous les comptes utilisent le mot de passe **`Demo123!`**.

| Rôle | Email |
|------|-------|
| Super Admin | `superadmin@sendistri.sn` |
| Admin | `admin@sendistri.sn` |
| Manager | `manager@sendistri.sn` |
| Comptable | `comptable@sendistri.sn` |
| Logisticien | `logisticien@sendistri.sn` |
| Commercial | `commercial@sendistri.sn` |
| Vendeur | `vendeur@sendistri.sn` |

Le menu latéral est filtré dynamiquement selon le rôle.

## Identité visuelle

Couleurs du drapeau sénégalais : vert primaire `#0E8A4F`, jaune/or `#E2A000`, rouge
`#D23A2C`, sidebar vert très foncé `#0B2A1B`. Polices : Manrope (interface),
IBM Plex Mono (montants/codes).

## Structure du projet

```
.
├── docker-compose.yml
├── backend/          # API NestJS + Prisma
│   ├── prisma/       # schema.prisma + seed.ts
│   └── src/          # modules: auth, users, dashboard, ...
├── frontend/         # App React + Vite
│   └── src/
│       ├── components/  # ui, layout, dashboard
│       ├── pages/
│       ├── store/       # auth (Zustand)
│       └── router/
└── project/          # prototype de design d'origine (référence)
```

## État d'avancement

- [x] **Étape 1 — Socle** : Docker, schéma Prisma (20 modèles), auth JWT + RBAC,
      layout (sidebar 14 modules + header + thème), login, tableau de bord, seed.
- [x] **Étape 2 — Référentiels (Paramétrage)** : CRUD REST (Formules, Banques,
      Localités/Secteurs, Entrepôts, PDV, Users) avec RBAC, et 7 pages front
      câblées à l'API (Formules, Banques, Localités, Entrepôts, Liste PDV,
      Vadeurs, Comptes PDV) via un composant générique `CrudResourcePage`.
- [x] **Étape 3 — Cœur métier** : Encaissement (`montantTotal = prixFormule×nbMois
      + options`, `monnaie = reçu − total`, refus si négatif, reçu imprimable,
      mise à jour du solde PDV), recherche abonné, vue Bureau/Terrain (mobile),
      et Suivi Solde PDV (`solde = Σ encaissements − Σ versements validés`,
      dépassement vs caution).
- [x] **Étape 4 — Finances + sécurité** : Versements & Retraits (création +
      validation/rejet avec mise à jour réelle des soldes PDV **et** banque +
      journal d'audit), Détails opérations bancaires, tableau de bord branché
      sur des données **réelles**. Durcissement : Helmet, rate-limiting (login),
      secret JWT obligatoire, validation stricte. Anti-saut-de-page (scrollbar
      gutter + squelettes à hauteur fixe).
- [x] **Étape 5 — Rapports & contrôle** : Import Excel (`.xlsx` via exceljs,
      aperçu + idempotence anti-doublon), Matching rapport vs encaissements
      (écarts), Commissions (calcul mensuel réel par PDV : bonus recrutement +
      10 % CA formule + 10 % CA réabo + prime migration − déductions).
- [x] **Étape 6 — Service Abonnement** : AAE, échus, non-qualifiés, Suivi M+, Bienvenue, période de recrutement, SMS de rappel en masse (mock), ARPU/réabo — données réelles. Données factices supprimées de la page générique.
- [x] **Étape 7 — Logistique** : inventaire entrepôt/réseau, consultation décodeurs, recherche décodeur (traçabilité + abonnés liés), immobilisés > 3 mois, mouvements/livraisons (SAT + G11). Seed enrichi (3 entrepôts, 60 décodeurs, mouvements, échéances futures).
- [x] **Étape 8 — Analytique / Statistiques** : CA par PDV, classement PDV
      (podium), poids des formules, recrutement par user, ARPU, matériels vendus,
      et journal d'audit réel (admin-only). Agrégats réels par période.
- [x] **Étape 9 — Finitions** : tests unitaires (Jest, 22 tests sur encaissement /
      commissions / soldes / matching), logique métier extraite dans `src/domain/`,
      documentation API Swagger (`/api/docs`), seed enrichi (données du mois courant
      pour dashboard/analytics/commissions).
- [x] **Modules complémentaires** : Dépenses internes, Objectifs Distributeur/PDV
      (suivi cible vs réalisé), Gestion Accessoires complète (catalogue,
      approvisionnement, livraison réseau, ventes, retours défectueux), et
      Gestion des VAD (agents, stock décodeurs, livraison/attribution, vente kit)
      — nouveaux modèles Prisma + données seed réelles.
- [x] **Modules finaux** : Gestion Crédit (suivi crédit affectable, rapport dette),
      Arrêtés de soldes (clôture avec règle métier #7 : interdit si versements en
      attente), Augmentation de caution, Suivi installation, Consultation G11,
      Liste réabo MOMO, Base de données globale — données réelles. Vues Suivi
      Commercial / États restantes branchées sur les agrégats réels existants.
