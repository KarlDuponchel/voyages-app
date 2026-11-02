# Héberger Tripmates sur le VPS avec Dokploy

Le site (page d'accueil, pages légales et app) est un site statique compilé par Vite. Sur le VPS, Dokploy construit l'image Docker du projet à chaque push, et Traefik la sert en HTTPS sur `tripmates.app`.

Rien ne change pour Supabase (base, comptes, fonctions, stockage), ni pour Cloudflare (domaine et relais des e-mails transférés).

## Ce qu'il y a dans le projet

| Fichier | Rôle |
|---|---|
| `Dockerfile` | Compile le site avec Node 22 (`npm ci`, `npm run build`), puis le sert avec nginx |
| `deploy/nginx.conf` | Les adresses : `/` → accueil, `/cgv` etc. → pages légales, le reste → l'app ; cache, compression |
| `deploy/securite.conf` | En-têtes de sécurité (HSTS, nosniff, etc.) |
| `.dockerignore` | Ce qui n'entre pas dans l'image (Supabase, maquettes, scripts…) |
| `src/lib/analytics.ts` | Mesure d'audience Umami, inactive tant qu'elle n'est pas configurée |

Règles d'adresses (les mêmes que `vercel.json` et `vite.config.ts`) :

- `/` : page d'accueil publique (`index.html`) ;
- `/cgv`, `/mentions-legales`, `/confidentialite` : pages légales ;
- `/index.html`, `/cgv.html`… : redirigés vers l'adresse sans `.html` ;
- toute autre adresse sans extension (`/monde`, `/voyages/…`, `/invitation/…`) : l'app (`app.html`) ;
- un fichier introuvable (`/image.png`) : erreur 404 ;
- `/sante` : répond « ok », pour Dokploy et la surveillance.

Cache : un an pour `assets/` (le nom des fichiers change à chaque version), et revérification à chaque visite pour le reste. C'est ce qui permet à l'app installée de se mettre à jour toute seule.

Vérifié en local le 02/11 : image construite, toutes les adresses et les en-têtes testés, service worker actif dans Chrome.

Pour tester l'image sur ton PC (Docker Desktop lancé) :

```bash
docker build -t tripmates $(grep -E '^VITE_[A-Z_]+=' .env | sed 's/^/--build-arg /') .
docker run --rm -p 8088:80 tripmates
```

Puis ouvrir http://localhost:8088.

## 1. Préparer le VPS

- Ubuntu 24.04, de préférence en Europe (RGPD), au moins 2 Go de mémoire : la compilation de l'app en a besoin.
- Accès SSH par clé, mot de passe désactivé.
- Pare-feu : `ufw allow 22,80,443/tcp`, puis `ufw enable`. Le port 3000 (interface de Dokploy) sera fermé à l'étape 3.
- Mises à jour de sécurité automatiques : `apt install unattended-upgrades`.
- Installer Dokploy (voir docs.dokploy.com) :

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

## 2. DNS chez Cloudflare (domaine `tripmates.app`)

| Type | Nom | Valeur | Proxy |
|---|---|---|---|
| A | `tripmates.app` | adresse IP du VPS | désactivé (nuage gris) |
| CNAME | `www` | `tripmates.app` | désactivé |
| A | `dokploy` | adresse IP du VPS | désactivé |
| A | `stats` (si Umami) | adresse IP du VPS | désactivé |

- **Ne pas toucher aux enregistrements MX et TXT** : ce sont ceux de Cloudflare Email Routing (import des e-mails et future boîte `contact@`).
- Proxy désactivé au début, pour que Let's Encrypt délivre les certificats. On pourra l'activer ensuite, en mode SSL « Full (strict) ».

### Cloudflare devant le serveur (proxy, nuage orange)

C'est le réglage choisi par Karl le 02/11 : le site passe par Cloudflare, et l'adresse du serveur (57.131.148.58, OVH) n'apparaît pas.

- **Certificat du serveur** : avec le proxy, Let's Encrypt n'obtient pas de certificat, et Traefik présente son certificat par défaut. Il faut donc :
  1. Cloudflare → SSL/TLS → **Origin Server → Create Certificate** (RSA, `tripmates.app` et `*.tripmates.app`, 15 ans). Copier le certificat et la clé privée ;
  2. Dokploy → **Settings → Certificates → Add Certificate** : coller le certificat et la clé ;
  3. dans l'application, onglet **Domains** : pour `tripmates.app`, garder HTTPS et choisir le fournisseur de certificat **None** (Traefik utilise alors le certificat ajouté) ;
  4. Cloudflare → SSL/TLS → mode **Full (strict)**.
- **`www`** : Cloudflare → Rules → **Redirect Rules → modèle « Redirect from WWW to root »** (redirection 301 de `www.tripmates.app/*` vers `https://tripmates.app/${1}`), avec un enregistrement `www` proxifié.
- **Cache** : Cloudflare respecte les en-têtes du serveur (un an pour `assets/`, revérification pour les pages). Rien à régler. Après un déploiement, inutile de vider le cache de Cloudflare.

## 3. Dokploy

1. Ouvrir `http://IP-du-VPS:3000`, créer le compte administrateur.
2. **Settings → Web Server → Domain** : `dokploy.tripmates.app` avec HTTPS. Une fois que ça marche, fermer le port 3000 (`ufw deny 3000`).
3. **Settings → Git → GitHub** : connecter le compte GitHub et autoriser le dépôt `voyages-app`.
4. **Créer un projet** « Tripmates », puis **Create Service → Application** :
   - Provider : GitHub, dépôt `voyages-app` ;
   - Branch : `feat/design-wayfarer` pour le test, puis `main` ;
   - Build Type : **Dockerfile**, chemin `./Dockerfile` ;
   - Auto Deploy : activé (déploiement à chaque push).
5. **Environment → Build-time arguments** (onglet des arguments de compilation, pas celui de l'exécution) : recopier les valeurs du `.env` :

```
VITE_SUPABASE_URL=…
VITE_SUPABASE_PUBLISHABLE_KEY=…
VITE_IMPORT_DOMAIN=tripmates.app
VITE_VAPID_PUBLIC_KEY=…
```

   Ces valeurs sont publiques (elles finissent dans le site), aucun secret ici.

6. **Domains** :
   - d'abord le domaine de test proposé par Dokploy (`….traefik.me`), port 80, pour vérifier ;
   - puis `tripmates.app`, port 80, HTTPS avec Let's Encrypt ;
   - et `www.tripmates.app`, avec une redirection vers `tripmates.app`.
7. **Deploy**, puis vérifier `https://tripmates.app/sante`.

## 4. Bascule

À faire le même jour, dans cet ordre :

1. **Vérifier sur `https://tripmates.app`** : accueil, `/cgv`, connexion par code, un voyage, un billet hors ligne (mode avion).
2. **Supabase → Authentication → URL Configuration** :
   - Site URL : `https://tripmates.app` ;
   - Redirect URLs : ajouter `https://tripmates.app/**`.
3. **Secret `APP_URL`** (retours de Stripe et portail client) :

```bash
npx supabase secrets set APP_URL=https://tripmates.app
```

4. **Stripe** : adresse des CGV (`https://tripmates.app/cgv`) dans Paramètres → Informations publiques. Le webhook ne change pas : il pointe vers Supabase.
5. **Réinstaller l'app** sur les téléphones (Karl, Louna) : une app installée est liée à son adresse. Ouvrir `https://tripmates.app`, se connecter, ajouter à l'écran d'accueil, puis réactiver les notifications dans le profil. Les données ne bougent pas, elles sont dans Supabase. Les liens d'invitation déjà envoyés pointent vers l'ancienne adresse : en renvoyer si besoin.
6. **Ancienne adresse Vercel** : la rediriger une ou deux semaines vers `tripmates.app`, en remplaçant `vercel.json` par :

```json
{
  "redirects": [{ "source": "/(.*)", "destination": "https://tripmates.app/$1", "permanent": true }]
}
```

   puis supprimer le projet Vercel et `vercel.json` du dépôt.

7. **Google Search Console** : ajouter `tripmates.app` (vérification par DNS chez Cloudflare) et envoyer `https://tripmates.app/sitemap.xml`.

## 5. Mesure d'audience (facultatif) : Umami

Vercel Analytics ne marche que chez Vercel ; il a été retiré. Pour le remplacer :

1. Dans Dokploy : **Create Service → Template → Umami**, domaine `stats.tripmates.app` avec HTTPS.
2. Dans Umami : changer le mot de passe par défaut, ajouter le site `tripmates.app`, noter son identifiant (Website ID).
3. Dans l'application Tripmates, ajouter aux arguments de compilation, puis redéployer :

```
VITE_UMAMI_SRC=https://stats.tripmates.app/script.js
VITE_UMAMI_WEBSITE_ID=…
```

Umami ne pose pas de cookie : pas de bandeau de consentement à prévoir. Il est déjà cité dans la politique de confidentialité.

## 6. Surveillance

- **Uptime Kuma** (Dokploy → Template), domaine par exemple `statut.tripmates.app`, avec une sonde sur `https://tripmates.app/sante` et une alerte par e-mail.
- Rien à sauvegarder sur le VPS pour Tripmates : le site se reconstruit depuis GitHub, et les données sont dans Supabase. Sauvegarder seulement la base d'Umami si on y tient (Dokploy → Backups).
