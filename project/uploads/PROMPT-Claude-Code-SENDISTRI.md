# Prompt pour Claude Code — Développement de SENDISTRI

> Copiez tout le contenu ci-dessous et collez-le dans Claude Code (dans un dossier de projet vide).
> Un prototype HTML cliquable existe déjà comme référence visuelle et fonctionnelle —
> joignez le fichier `SENDISTRI.dc.html` (ou le bundle `SENDISTRI ERP.html`) à votre première
> demande à Claude Code pour qu'il reproduise fidèlement l'interface.

---

## CONTEXTE & OBJECTIF

Tu vas développer **SENDISTRI**, une application web de **gestion commerciale pour un distributeur télécom** au Sénégal (revente d'abonnements TV/internet, décodeurs, kits, accessoires via un réseau de points de vente — PDV — et de vendeurs à domicile — VAD).

L'application doit être **multi-utilisateurs, multi-rôles**, fonctionner sur **desktop** (siège, administration) et offrir une **vue mobile terrain** pour l'encaissement. Tous les montants sont en **FCFA** (format `1 204 000 F`, séparateur = espace insécable). Langue de l'interface : **français**.

Un prototype cliquable (HTML) est fourni comme **référence de design et de comportement** : reproduis fidèlement sa charte visuelle, sa structure de menu, ses écrans et ses interactions.

---

## STACK TECHNIQUE IMPOSÉE

- **Frontend** : React 18 + TypeScript + Vite. Routing avec React Router. État serveur avec TanStack Query. Styling avec Tailwind CSS (configure les tokens ci-dessous) + composants maison (pas de librairie UI lourde imposée ; shadcn/ui accepté).
- **Backend** : Node.js + TypeScript + **NestJS** (ou Express si tu préfères, mais structure modulaire obligatoire). API REST documentée avec OpenAPI/Swagger.
- **Base de données** : **PostgreSQL** avec **Prisma** comme ORM. Migrations versionnées.
- **Auth** : JWT (access + refresh tokens), mots de passe hachés avec bcrypt/argon2, RBAC (contrôle d'accès par rôle).
- **Fichiers** : upload de pièces (photos de bordereaux, imports Excel) — stockage local en dev, compatible S3 en prod.
- **Import/Export** : lecture/écriture de fichiers `.xlsx` (librairie `exceljs` ou `xlsx`).
- **Tests** : Vitest/Jest pour la logique métier critique (calcul de commissions, matching, soldes).
- **Qualité** : ESLint + Prettier, structure de dossiers claire, commits atomiques.

Mets en place un **docker-compose** (Postgres + API + front) et un README d'installation. Fournis un script de **seed** avec des données réalistes sénégalaises (noms de PDV : Boutique Liberté 6, Agence Sandaga, Sous-Réseau Pikine… ; noms de personnes : Fatou Ndiaye, Mamadou Sow, Aïssatou Fall… ; secteurs : Dakar Centre, Dakar Banlieue, Thiès, Petite Côte, Nord, Sud-Casamance).

---

## IDENTITÉ VISUELLE (à configurer dans Tailwind)

Reproduis exactement la charte du prototype (couleurs du drapeau sénégalais) :

```
Vert primaire     #0E8A4F   (foncé #0A6B3D)   → succès, validé, actions principales
Vert clair        #E7F4EC   / #F1F9F4         → fonds de succès
Jaune / Or        #E2A000   (foncé #8A5E00)   → alerte, en attente, accent
Rouge             #D23A2C   (foncé #A82E22)   → erreur, urgent, échu, solde négatif
Bleu              #2B6CB0                      → information, lignes de totaux
Sidebar (menu)    #0B2A1B   (vert très foncé) → fond du menu latéral
Texte             #13201A   / secondaire #566159 / tertiaire #8A938B
Fond app          #F4F6F3   / surface #FFFFFF / bordure #E6EAE3
```

- **Mode sombre** complet avec bascule (clair/sombre persistée).
- **Polices** : `Manrope` (interface, via Google Fonts), `IBM Plex Mono` (chiffres, montants, codes/références).
- **Logo** : badge vert arrondi avec une étoile blanche (étoile du drapeau sénégalais) + un bandeau tricolore vert/jaune/rouge sous l'étoile. Nom « SENDISTRI ».
- **Couleurs sémantiques** : vert = validé, orange = en attente, rouge = urgent/négatif, bleu = info.
- Cartes KPI en haut des pages de liste, coins arrondis (~14px), ombres douces.

---

## RÔLES & PERMISSIONS (RBAC)

| Rôle | Périmètre |
|------|-----------|
| **Super Admin** | Accès total + suppression définitive + configuration système |
| **Admin** | Tout sauf suppression définitive |
| **Manager** | Lecture + création + modification de tout (pas de config système) |
| **Comptable** | Module Finances uniquement (soldes, versements, retraits, arrêtés, recouvrement) |
| **Logisticien** | Stocks : Logistique SAT & G11, Accessoires, VAD |
| **Commercial** | Encaissement + Service Abonnement + Suivi Commercial |
| **Vendeur / PDV** | Encaissement + consultation limitée à SON point de vente |

- Le menu latéral est **filtré dynamiquement** selon le rôle.
- Chaque endpoint API vérifie la permission (guard NestJS).
- Ne jamais supprimer un utilisateur ni un PDV : utiliser un statut **actif/inactif** (soft delete) pour préserver l'historique.
- Journaliser les actions sensibles (audit log : qui, quoi, quand, IP).

---

## STRUCTURE DU MENU (14 modules)

Reproduis cette arborescence exacte (sections dépliables, badges de notification rouges sur certains items) :

**Tableau de Bord** — KPI (recrutements, réabonnements, stock décodeurs, encaissé du jour), courbe d'activité recrutement/réabo, commissions du mois, suivi par secteur, panneau d'alertes cliquables.

**1. Paramétrage** : Formule d'abonnement · Entrepôt · Périodes d'activités · Comptes du Distributeur · PDV, Comptes PDV et Users · Liste des PDV et Partenaires · Reprise des soldes existants · Objectifs Distributeur et PDV · Bonus et Critères de calcul · Déduction des abonnés non qualifiés · Chargement des M+1 · Banques · Localités · Vadeurs

**2. Opérations** : Rapport d'activité · Consultation G11 · Encaissement · Matching (Rapport / Encaissement) · Versement en banque `badge` · Retrait de banque · Détails opérations bancaires · Suivi Solde PDV · Arrêtés de soldes PDV · Dépenses internes · Augmentation de caution · Suivi installation

**3. Gestion Crédit** : Suivi crédit affectable · Rapport dette

**4. Service Abonnement** : Période de recrutement · Bienvenue aux nouveaux abonnés · Liste des abonnés non qualifiés · Suivi M+ · Arrivants à échéance (AAE) `badge` · Liste des échus

**5. Suivi Commercial** : Suivi objectif journalier M+1 · Retour client RPE · Performances CC · Statistiques Bienvenue · Poids des Formules et PDV · Recap Recrutement par Formule · Poids des boutiques · Liste des échus · Liste des réabo MOMO · Recrutement par Formule/User · Taux RPE · ARPU · DN : ouverture nouveau PDV · Base de données globale

**6. Logistique Principale / SAT** : Commandes de décodeurs et kits · Inventaire Stock Entrepôts · Inventaire Stock PDV · Approvisionnement Entrepôt · Consultation du stock Entrepôt · Consultation du stock Réseau · Livraison · Décodeurs non sortis depuis 3 mois `badge` · Recherche Décodeur · Suivi Vente Paraboles · Suivi Vente Décodeurs · Recap Vente Décodeurs · Gap Kit après vente · Mise à jour du stock décodeur

**7. Logistique G11** : Inventaire Stock Entrepôts · Inventaire Stock PDV · Approvisionnement Entrepôt · Consultation du stock Entrepôt · Consultation du stock Réseau · Livraison · Recherche Décodeur

**8. Gestion Accessoires** : Approvisionnement Entrepôt · Consultation stock Entrepôt · Initialisation stock Réseau · Consultation stock Réseau · Livraison · Suivi Ventes d'accessoires · Versement PDV · Retour des défectueux en agence

**9. Gestion des VAD** : Initialisation stock VAD · Livraison stock VAD · Vente Kit · Consultation stock VAD

**10. États Analytiques** : Matériels vendus · Récapitulatifs des activités · Recap Audit · Recouvrement PDV et USERS · Suivi quotidien PDV · Rendement des USERS · Suivi quotidien USERS · État des installations · Suivi Recrutement · Suivi Reabo · Suivi Objectifs Distributeur · Suivi Objectif PDV / Sous-Réseau · Récap Objectif PDV · Commissions Partenaires

**11. Statistiques** : Suivi quotidien Objectif PDV & SR · Classement PDV & SR · Chiffre d'affaire PDV & SR

---

## MODÈLE DE DONNÉES (entités Prisma principales)

Conçois le schéma complet ; voici les entités clés et leurs relations :

- **User** (id, nom, email, passwordHash, role, pdvId?, statut actif/inactif, createdAt)
- **PDV** (id, code, raisonSociale, type [Boutique propre / Sous-réseau / Agence principale / VAD / Apporteur], secteurId, localiteId, regimeFiscal, caution, soldeActuel, statut)
- **Secteur**, **Localite** (référentiel géographique)
- **Formule** (code, nomCommercial, prixMateriel, prixFormule, statut) — ex : ACCESS 5000, ÉVASION 10000, ÉVASION+ 15000, TOUT CANAL 20000, PRESTIGE 30000
- **Abonne** (numAbonne, nom, prenom, tel1, tel2, formuleId, decodeurId, pdvId, dateEcheance, statut [Actif / Échu / Suspendu / Résilié], canalReabo)
- **Decodeur** (numSerie, type [Z4 / GLOBAZ / G11], statut [En stock entrepôt / En stock PDV / Vendu / Immobilisé / Défectueux], entrepotId?, pdvId?, dateEntree)
- **Encaissement** (id, abonneId, pdvId, userId, nature [Recrutement / Réabonnement / Migration], formuleId, nbMois, montantTotal, montantRecu, monnaie, modePaiement [Espèce / Wave / Orange Money / Chèque / Virement], options [Premium / International / Timbre], date, recuNumero)
- **Versement** (id, pdvId, montant, banqueId, dateVersement, periode, libelle, numBordereau, photoBordereau, statut [En attente / Validé / Rejeté], motifRejet?, validePar?)
- **Retrait** (similaire au versement)
- **Banque** (nom, numCompte, type [Banque / Mobile Money / Wave], soldeActuel)
- **RapportActivite** (id, date, fichierImporte, montantTotal, sat, fibre, rex, nbReabo, caReabo, nbRecru, caFormule, caCreatZ4, caCreatGZ, caCreatG11, caPayech, caAccessoires, statutMatching, importePar, importeLe)
- **Entrepot** (code, nom, type [Principal / Secondaire], capacite, statut)
- **MouvementStock** (id, type [Entrepôt→PDV / PDV→PDV / Entrepôt→Entrepôt / PDV→Entrepôt], materiel, source, destination, quantite, numBonLivraison, date, decodeurs[], statut)
- **Accessoire**, **StockAccessoire**, **VenteAccessoire**, **RetourDefectueux**
- **VAD** (vendeur terrain : code, nom, zone, statut) + **StockVAD** + **VenteKit**
- **Objectif** (secteurId/pdvId, typeObjectif [Recrutement / Réabo / Migration], cible, periode)
- **CritereCommission** (typeOperation, roMin, bonusParAbonne, pourcentageCA, validite)
- **Commission** (partenaire/pdvId, periode, comRecrutement, comFormule, comReabo, primeM1, deductions, comNette, statut)
- **ArreteSolde** (pdvId, dateArrete, soldeFige, periode, statut [En cours / Signé], pdf)
- **Depense** (date, categorie, motif, montant, justificatif)
- **AuditLog** (userId, action, module, ip, timestamp)
- **Alerte** / **Notification** (type [warn / ok / urgent], message, lien, lu, dismissed)

---

## RÈGLES MÉTIER CRITIQUES (à implémenter et tester)

1. **Encaissement** : `montantTotal = prixFormule × nbMois + options`. `monnaie = montantRecu − montantTotal`. Refuser la validation si `montantRecu < montantTotal` (monnaie négative). À la validation : générer un **reçu imprimable** (numéro unique, PDV, client, formule, mode de paiement, date/heure, total/reçu/monnaie). Mettre à jour le solde du PDV.

2. **Versement en banque** : photo de bordereau **obligatoire**. Statut initial **« En attente »**. Seul un Admin/Comptable peut **valider** (met à jour le solde PDV et le solde banque) ou **rejeter** (motif obligatoire). Un versement non validé ne réduit pas le solde dû.

3. **Import du rapport d'activité** : fichier `.xlsx` envoyé par l'opérateur. Valider le format (colonnes attendues : Date, PDV Code, Formule, Type opération, Nombre, Montant). Afficher un résumé (lignes détectées, montant total) avant confirmation. **Empêcher le double import** du même rapport (clé d'idempotence sur la date/source).

4. **Matching** : comparer ligne à ligne le **rapport opérateur** vs les **encaissements saisis** (par formule, nombre, montant). Mettre en évidence les **écarts** (lignes rouges). Permettre de marquer « matché » une fois corrigé.

5. **Calcul des commissions** (mensuel) : `commission_recrutement = nbRecrutements × bonusMateriel (ex 3 500 F)` + `commission_formule = 10% du CA HT formule` + `commission_reabo = 10% du CA HT réabo` + `prime_migration_G11 = montant_fixe × nb_migrations` − `déductions (abonnés non qualifiés)` = **commission nette**. Tenir compte des critères paramétrables (R/O minimum). Export PDF par partenaire.

6. **Suivi des soldes PDV** : `solde = Σ encaissements − Σ versements validés`. Alerter si le solde dépasse le **plafond** (= caution) du PDV. Vue de recouvrement avec taux.

7. **Arrêté de soldes (clôture mensuelle)** : interdit s'il reste des versements « en attente ». Fige les soldes et génère un PDF signable.

8. **Traçabilité des décodeurs** : chaque décodeur suit un cycle de statut `EN_STOCK_ENTREPOT → EN_STOCK_PDV → VENDU` (ou `IMMOBILISÉ` / `DÉFECTUEUX`). La page « Recherche Décodeur » retrace tous ses mouvements. Alerte sur les décodeurs non sortis depuis > 3 mois.

9. **Abonnés à échéance (AAE)** : lister ceux dont l'échéance arrive sous X jours et non réabonnés. Permettre l'envoi de **SMS de rappel en masse** (intégration passerelle SMS — prévoir une interface, mock en dev). Calculer le **taux RPE** (réactivés / échus) et l'**ARPU**.

---

## COMPOSANTS UI TRANSVERSES (sur toutes les pages de liste)

Tous les tableaux doivent offrir :
- **Sélecteur « lignes par page »** (10 / 25 / 50 / 100)
- **Recherche** instantanée
- **Tri** par colonne
- **Cases à cocher** par ligne + « tout sélectionner » (actions de masse) avec compteur de sélection
- **Menu d'actions par ligne** (bouton ▼ : Voir détail / Modifier / Résumé… selon contexte)
- **Ligne de TOTAUX** (surlignée en bleu) sommant les colonnes numériques
- **Pagination** : Précédent / numéros de page / Suivant + « Résultats X–Y sur Z »
- **En-têtes figés** (sticky) et **scroll horizontal** pour les tableaux larges (ex : Rapport d'activité = 17 colonnes)
- **Export Excel** et **Export PDF**
- **Sous-onglets contextuels** quand pertinent (ex : Rapport d'activité → Importation | Consultation | Liste activations Users)

Autres éléments globaux :
- **Bandeaux d'alertes** fermables sous le header (orange = avertissement, vert = info, rouge = urgent) avec lien « consulter ».
- **Recherche globale** dans le header (abonnés, PDV, décodeurs) avec résultats et navigation.
- **Sélecteur de profil / déconnexion** en bas du menu.
- **Bascule mode clair / sombre** et **bascule vue bureau / terrain (mobile)**.
- **Fil d'Ariane** (Module › Sous-module › Page) et mise en évidence de l'item actif dans le menu.
- **Modaux** : fiche détail PDV (onglets Informations / Utilisateurs / Historique / Finances), formulaires de création contextuels, import Excel (dropzone), reçu d'encaissement, notifications.
- **Toasts** de confirmation pour chaque action.

---

## VUE MOBILE TERRAIN (encaissement)

Écran optimisé mobile pour les vendeurs/VAD : recherche abonné → choix formule & mode de paiement (Wave / OM / Espèce…) → calcul automatique → encaisser → reçu. Hit targets ≥ 44px. Doit fonctionner sur connexion faible (envisager une mise en file d'attente offline si possible, sinon le prévoir dans l'architecture).

---

## LIVRABLES ATTENDUS

1. Monorepo (ou deux dossiers `frontend` / `backend`) avec README d'installation clair.
2. `docker-compose.yml` (Postgres + API + front) qui démarre en une commande.
3. Schéma Prisma complet + migrations + script de **seed** avec données sénégalaises réalistes.
4. API REST sécurisée (JWT + RBAC) documentée (Swagger).
5. Frontend React fidèle au prototype (charte, menu, écrans, interactions), responsive, mode sombre.
6. Tests unitaires sur la logique critique (encaissement, matching, commissions, soldes).
7. Comptes de démonstration pour chaque rôle (ex : `admin@sendistri.sn`).

---

## MÉTHODE DE TRAVAIL

Procède par **incréments livrables et testables**, dans cet ordre :

1. **Socle** : init repo, Docker, Postgres, schéma Prisma de base, auth (login/JWT/RBAC), layout (sidebar + header + thème), seed minimal.
2. **Référentiels (Paramétrage)** : Formules, PDV, Entrepôts, Banques, Utilisateurs, Secteurs/Localités, Objectifs, Critères.
3. **Cœur métier** : Encaissement (+ reçu) et vue mobile, Suivi Solde PDV.
4. **Finances** : Versements (+ validation), Retraits, Arrêtés, Détails bancaires.
5. **Rapports & contrôle** : Import Rapport d'activité, Matching, Commissions.
6. **Service Abonnement** : Échéances, Bienvenue, Non qualifiés, SMS.
7. **Logistique** : SAT, G11, Accessoires, VAD (mouvements de stock, traçabilité décodeurs).
8. **Analytique** : États Analytiques, Suivi Commercial, Statistiques, Tableau de bord.
9. **Finitions** : exports Excel/PDF, audit log, alertes, tests, polish responsive & dark mode.

À chaque étape : explique brièvement ce que tu fais, livre un code propre et commité, et indique comment tester. Pose-moi une question si une règle métier est ambiguë plutôt que de deviner.

---

*Référence visuelle et fonctionnelle : le prototype `SENDISTRI.dc.html` (fourni). Reproduis-le fidèlement.*
