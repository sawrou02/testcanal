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
npx prisma db push            # ou: npx prisma migrate dev
npx ts-node prisma/seed.ts    # données de démonstration
npm run start:dev             # http://localhost:3000
```

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
- [ ] Étape 2 — Référentiels (Paramétrage)
- [ ] Étape 3 — Cœur métier (Encaissement + reçu, vue mobile, Suivi Solde PDV)
- [ ] Étape 4 — Finances (Versements, Retraits, Arrêtés)
- [ ] Étape 5 — Rapports & contrôle (Import, Matching, Commissions)
- [ ] Étape 6 — Service Abonnement
- [ ] Étape 7 — Logistique (SAT, G11, Accessoires, VAD)
- [ ] Étape 8 — Analytique (États, Suivi Commercial, Statistiques)
- [ ] Étape 9 — Finitions (exports, audit, tests, polish)
