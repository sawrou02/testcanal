# SENDISTRI — Mettre le logiciel EN LIGNE (pour test client)

Objectif : le client ouvre **un simple lien**, teste le logiciel, **sans jamais avoir le code**.

Architecture : **Frontend → Vercel** · **Backend → Render** · **Base → PostgreSQL (Neon)**.
Tout est **gratuit** pour un test (offres gratuites).

> ⚠️ La version hors-ligne Windows n'est pas modifiée : elle continue de marcher en SQLite.

---

## Résumé (5 étapes, ~30 min)

1. **GitHub** — mettre le code dans un dépôt **privé**
2. **Neon** — créer une base PostgreSQL gratuite → récupérer l'URL
3. **Render** — déployer le backend (le serveur)
4. **Vercel** — déployer le frontend (le site)
5. **Relier les deux** + première connexion

---

## Étape 1 — GitHub (dépôt PRIVÉ)

1. Va sur https://github.com → **New repository**
2. Nom : `sendistri` · **coche « Private »** (surtout pas public) · **Create**
3. Sur ton PC, dans le dossier du projet :
   ```
   git remote add origin https://github.com/TON-COMPTE/sendistri.git
   git push -u origin HEAD
   ```
   *(le fichier `.gitignore` exclut déjà les données, la base et les fichiers uploadés)*

---

## Étape 2 — Base PostgreSQL (Neon, gratuit)

1. Va sur https://neon.tech → **Sign up** (avec ton GitHub)
2. **Create project** → nom `sendistri` → région **Europe (Frankfurt)** (proche du Sénégal)
3. Neon affiche une **Connection string** qui ressemble à :
   ```
   postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Copie-la** et garde-la de côté (c'est ta `DATABASE_URL`).

---

## Étape 3 — Backend sur Render (le serveur)

1. Va sur https://render.com → **Sign up** (avec GitHub)
2. **New +** → **Blueprint** → choisis ton dépôt `sendistri`
   *(Render lit automatiquement le fichier `render.yaml` fourni)*
3. Render demande 2 valeurs (les seules à remplir) :
   - **DATABASE_URL** → colle l'URL Neon de l'étape 2
   - **WEB_ORIGIN** → laisse **vide pour l'instant** (on la remplit à l'étape 5)
4. Clique **Apply / Create**. Render installe, prépare la base et démarre (~3-5 min).
5. Quand c'est prêt, Render te donne une **URL** du type :
   ```
   https://sendistri-api.onrender.com
   ```
   **Copie-la** (c'est l'adresse du serveur).
6. Vérifie qu'elle marche : ouvre `https://sendistri-api.onrender.com/api/region/config` → tu dois voir du texte `{"pays":"SN",...}`.

> 💡 Offre gratuite Render : le serveur « s'endort » après 15 min sans visite. La **première** ouverture après une pause prend ~30 s à se réveiller, ensuite c'est rapide. Normal pour un test.

---

## Étape 4 — Frontend sur Vercel (le site)

1. Va sur https://vercel.com → **Sign up** (avec GitHub)
2. **Add New… → Project** → choisis ton dépôt `sendistri`
3. **Root Directory** : clique **Edit** et choisis le dossier **`frontend`** *(important)*
4. Dans **Environment Variables**, ajoute :
   - **Name** : `VITE_API_URL`
   - **Value** : l'URL Render de l'étape 3 (ex. `https://sendistri-api.onrender.com`)
5. Clique **Deploy** (~2 min). Vercel te donne l'URL du site :
   ```
   https://sendistri.vercel.app
   ```
   **C'est le lien que tu enverras au client.**

---

## Étape 5 — Relier les deux (CORS)

Le serveur doit autoriser ton site à lui parler.

1. Retourne sur **Render** → ton service `sendistri-api` → onglet **Environment**
2. Modifie la variable **WEB_ORIGIN** → mets l'URL Vercel (ex. `https://sendistri.vercel.app`)
   *(sans barre `/` à la fin)*
3. **Save** → Render redémarre tout seul (~1 min).

---

## C'est en ligne ! Premier test

1. Ouvre ton lien Vercel (ex. `https://sendistri.vercel.app`)
2. Connecte-toi : **admin@sendistri.sn** / **Demo123!**
3. Va dans **Paramétrage ▸ Données de démonstration ▸ Charger** → le logiciel se remplit
4. Envoie le lien Vercel au client 🎉

---

## Sécurité avant d'envoyer au client (important)

- [ ] **Change le mot de passe admin** (Paramétrage ▸ Comptes) — ne laisse pas `Demo123!` en ligne
- [ ] Le `JWT_SECRET` est **déjà** généré automatiquement par Render (sécurisé)
- [ ] C'est un **test** : préviens le client que c'est une démonstration
- [ ] Fais signer un **accord de test** (test uniquement, pas de copie/redistribution) — le client n'a **jamais** le code, mais l'accord protège l'usage

---

## En cas de souci

| Problème | Cause probable | Solution |
|---|---|---|
| Le site s'ouvre mais « erreur » partout | `VITE_API_URL` mal réglé | Vérifie l'URL Render dans Vercel, puis **Redeploy** |
| « erreur » à la connexion / CORS | `WEB_ORIGIN` mauvais | Mets l'URL Vercel exacte dans Render (sans `/` final) |
| Première ouverture longue | Serveur Render endormi | Normal (offre gratuite), attends 30 s |
| Base vide | Seed pas passé | Render → Manual Deploy → « Clear build cache & deploy » |

Envoie-moi une capture de l'erreur si besoin, je te débloque.
