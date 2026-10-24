# Suivi du projet Voyages

## Session du 20 octobre 2026

### Fait
- **Choix techniques** : PWA (pas d'App Store) — React + Vite + vite-plugin-pwa, hébergée sur Vercel.
- **Maquettes Figma** : [App Voyages – Maquettes](https://www.figma.com/design/J8QdhWNMcqYjOMrcb3tMR5)
  - 6 écrans × 2 thèmes (sombre en haut, clair en dessous) : Monde, Voyage, Billet, Souvenirs, Statistiques, Ajout de réservation.
  - Palettes « Couleurs · Sombre » et « Couleurs · Clair », styles de texte, icônes et composants réutilisables.
  - Titres en **Bricolage Grotesque** (Sink abandonnée), texte en **DM Sans**.
- **App V1** (ce dossier), en ligne sur https://voyages-app-chi.vercel.app :
  - Les 6 écrans des maquettes + Profil (choix Auto / Clair / Sombre).
  - Globe 3D interactif, statistiques calculées, ajout manuel de réservations.
  - Couleurs modifiables dans `src/theme/palettes.ts`.
  - Fonctionne hors ligne et s'installe sur l'iPhone (Safari → Partager → Sur l'écran d'accueil).
  - Corrigés : texte flou sous la barre d'état iOS ; mise à jour automatique de l'app installée.

### À finir
- [x] **Envoyer sur GitHub** les derniers changements : `vercel.json`, `src/main.tsx`, `vite.config.ts` (`src/styles.css` est déjà parti).
- [ ] **Vérifier sur l'iPhone** :
  - [x] recharger une page comme `/voyages` ne donne plus d'erreur 404 ;
  - [ ] l'app installée se met bien à jour toute seule.
- [ ] **Retouches Figma** (thème clair) : barre d'état des écrans 02 et 06, QR code du billet 03, texte « PORTUGAL · 7 JOURS ».

### Prochaine étape : Supabase
1. Créer le compte et le projet sur supabase.com, avec un serveur **en Europe** (à faire par Karl).
2. Construire la base **en multi-utilisateurs** dès le départ : voyages, membres, invitations, sécurité par voyage (Row Level Security).
3. Connexion par lien magique envoyé par e-mail ; inviter la deuxième personne.
4. Remplacer le stockage local (`src/data/store.tsx`) par Supabase, pour synchroniser les deux téléphones.
5. Retirer ce qui est écrit en dur : « Bonjour Karl », départ de Paris pour les distances, liste fixe des pays visités (`src/data/countries.ts`).
6. Stockage des PDF de billets, puis des photos.

### Plus tard
- Lecture automatique des e-mails transférés et des PDF, par l'IA.
- Import des photos et vidéos, souvenirs automatiques.
- Budget partagé (qui a payé quoi).
- Notifications (rappel d'enregistrement 24 h avant un vol).
- Bilan annuel des voyages.
- Ouverture au public : RGPD, CGU, coûts.

## Session du 21 octobre 2026

### Fait
- **Police** : les titres sont en **Bricolage Grotesque**, Sink est retirée partout.
- **Base Supabase multi-utilisateurs** (projet `qpxcaywcslayfmcjcpgw`, région Europe) : le schéma est dans `supabase/migrations/20261021120000_schema_initial.sql` et expliqué dans [docs/supabase.md](docs/supabase.md).
  - Profils, voyages à plusieurs étapes, membres avec rôles (owner / editor / viewer), invitations par lien (usage unique, 14 jours), réservations avec fuseau horaire, fichiers (bucket privé `trip-files`), pays visités, suppression de compte.
  - La sécurité par voyage (RLS) est testée par `npm run test:db`.
- **App branchée sur Supabase** :
  - connexion par code reçu par e-mail (indispensable pour l'app installée sur iPhone) ;
  - création de voyage avec recherche de ville (Open-Meteo), y compris depuis un bouton flottant sur l'accueil ;
  - plusieurs villes par voyage (bloc « Étapes » dans l'onglet Itinéraire) ;
  - « Voyageurs » : membres, lien d'invitation, quitter ou supprimer le voyage ;
  - profil : prénom, ville de départ (pour les distances), pays visités avant l'app, déconnexion, suppression du compte ;
  - stats, globe et villes calculés à partir des vraies données ; voyages d'exemple retirés ;
  - copie locale pour consulter l'app hors ligne ;
  - **consolidation** : modifier un voyage (crayon en haut de sa page), modifier ou supprimer une réservation (écran du billet, avec une date de fin facultative), réordonner les étapes (flèches).
  - La sécurité par voyage (RLS) est vérifiée par 37 tests.
- **Côté Supabase** (fait par Karl) : migration exécutée, modèles d'e-mail avec `{{ .Token }}`, SMTP `noreply@karlduponchel.fr`.

### Reste à vérifier
- [ ] **Redirect URLs** réglées (Vercel + localhost).
- [ ] Les e-mails arrivent en spam : vérifier SPF / DKIM / DMARC du domaine, et passer les modèles en français.
- [ ] Test complet à deux sur iPhone : installation, connexion, invitation, ajout de réservations par chacun.
- [ ] Sur iPhone 14 Pro (iOS 26 ?) : voile clair sous la barre d'état d'un voyage. Correctif en ligne (couleur de la couverture), à confirmer.

### Pour reprendre (mis à jour le 23/10)
- Tout est sur `main`, mis en ligne par Vercel, billets PDF compris (fusionnés le 23/10).
- À tester sur iPhone : joindre un PDF et une capture, « Afficher le billet », mode avion puis réouverture.
- Toujours à tester (21/10) : modifier un voyage (crayon), modifier ou supprimer une réservation, réordonner les étapes.
- Sur un nouveau poste ou dossier : `npm install` avant tout (sinon la compilation et `npm run test:db` échouent).
- Import par l'IA en ligne depuis le 24/10 : à tester avec de vrais billets et e-mails ([docs/import-ia.md](docs/import-ia.md)). Prochaine étape : **4. Photos et souvenirs**.
- Évolution de la base : nouveau fichier dans `supabase/migrations/`, `npm run test:db`, puis `npx supabase db push`.

## Session du 23 octobre 2026

### Fait (branche `feat/billets-pdf`)
- **Retiré** : le faux QR code du billet (la référence reste affichée en grand) et l'adresse e-mail de transfert fictive.
- **Billets PDF et captures** : joindre un fichier à l'ajout d'une réservation ou depuis l'écran du billet ; bouton « Afficher le billet » en plein écran (PDF dessiné par pdf.js, fond blanc pour le QR code) ; partage ou enregistrement du fichier ; suppression.
- **Hors ligne** : fichiers des voyages à venir copiés sur le téléphone, indication « Disponible hors ligne » par fichier, copie effacée à la déconnexion.
- Pas de migration : la table `booking_files` et le bucket `trip-files` existaient déjà.

- **Panneaux** (commit e2187d5) : croix de fermeture, et glissement vers le bas pour fermer.

### Reste à vérifier
- [ ] Sur iPhone : joindre un PDF et une capture, « Afficher le billet », mode avion puis réouverture du billet.
- [ ] Après déploiement : l'app installée récupère bien le lecteur de PDF pour le hors ligne (ouvrir l'app une fois avec du réseau).

## Session du 24 octobre 2026

### Fait (branche `feat/import-ia`)
- **Import automatique par l'IA**, décrit dans [docs/import-ia.md](docs/import-ia.md) :
  - **A. Lecture d'un billet** : dans « Ajouter → Avec le billet », Claude lit le PDF ou la capture et pré-remplit la réservation (données de la carte d'embarquement comprises). Plusieurs réservations dans un même billet, comme un aller-retour, se valident une à une ; le fichier est joint à chacune.
  - **B. E-mails transférés** : une adresse personnelle par compte (dans le profil, avec un bouton pour en changer). Les e-mails sont lus par Claude, puis présentés dans « Voyages → E-mails à valider » avec le voyage correspondant proposé. Les pièces jointes sont jointes aux réservations ajoutées.
  - Rien n'est enregistré sans validation. Les e-mails ne sont acceptés que depuis l'adresse du compte. Limite de 40 lectures par personne sur 24 h.
- **Serveur** : fonctions Supabase `extract-booking` et `inbound-email`, relais Cloudflare `email-worker/`, migration `20261024100000_import_ia.sql`.
- **Modèle** : `claude-opus-5-5` (effort `medium`, repli automatique en cas de refus), modifiable avec le secret `EXTRACT_MODEL`.
- **Tests** : 48 tests de sécurité de la base (`npm run test:db`) et 12 tests de la logique serveur avec un faux client Claude (`npm run test:functions`). Écrans vérifiés dans un banc d'essai, avec une fausse réponse de l'IA.

### Mise en route (faite le 24/10)
- [x] Domaine **tripmates.app** acheté chez Cloudflare. `karlduponchel.fr` n'est pas utilisé : ses MX servent à la boîte `contact@`.
- [x] Migration appliquée (`db push`), secrets `ANTHROPIC_API_KEY` et `INBOUND_SECRET`, fonctions `extract-booking` et `inbound-email` déployées.
- [x] Relais `voyages-email` déployé, Email Routing actif sur `tripmates.app` (catch-all → relais).
- [x] Types de la base régénérés ; branche `feat/import-ia` fusionnée dans `main`.

### Reste à vérifier
- [ ] **A** : ajouter une réservation avec un vrai billet PDF, puis avec une capture.
- [ ] **B** : transférer une vraie confirmation **depuis l'adresse du compte** vers l'adresse du profil (`…@tripmates.app`), puis la valider dans « E-mails à valider ».
- [ ] Relancer `npx wrangler deploy` dans `email-worker` pour appliquer `workers_dev = false` (pas d'adresse web publique pour le relais).
- [ ] Suivre le coût réel des lectures (console.anthropic.com, table `ai_usage`), puis choisir entre Opus 5.5 et Haiku 5.5 (secret `EXTRACT_MODEL`).

## Feuille de route conseillée

### 1. Consolider (court, avant d'inviter du monde)
- [x] Modifier ou supprimer une réservation, modifier un voyage (titre, dates, budget), réordonner les étapes.
- [x] **Supabase CLI** (fait par Karl le 21/10 ; types générés et branchés sur le client, voir [docs/supabase.md](docs/supabase.md) § Faire évoluer la base) : relier le projet une fois, puis appliquer les prochaines migrations en ligne de commande et générer les types TypeScript.
- Projet gratuit : Supabase **met en pause** un projet sans activité pendant 7 jours. À surveiller, ou passer en offre payante à l'ouverture.

### 2. Billets PDF — fait le 23/10 (branche `feat/billets-pdf`)
- Joindre un PDF ou une capture à une réservation : le bucket `trip-files` et ses règles de sécurité sont prêts.
- Consulter le billet hors ligne (le vrai QR code à l'embarquement).
- C'est la base de l'étape suivante.

### 3. Import automatique par l'IA (la fonction phare) — fait le 24/10, à tester avec de vrais billets
- Une adresse de transfert par utilisateur : réception de l'e-mail (Cloudflare Email Routing ou un service d'e-mails entrants), puis une Edge Function Supabase.
- L'IA (Claude) lit l'e-mail ou le PDF et extrait la réservation : type, dates, horaires, référence, données du billet.
- On la propose à l'utilisateur pour validation avant de l'enregistrer.

### 4. Photos et souvenirs
- Import des photos depuis le téléphone, compression avant envoi, stockage par voyage.
- Remplace le compteur `photos: 0` et les couvertures en dégradé.
- Points à anticiper : les quotas de stockage et leur coût.

### 5. Budget partagé
- Dépenses par voyage, qui a payé quoi, répartition et soldes entre participants.

### 6. Notifications
- Web Push : sur iPhone, ça ne marche qu'avec l'app installée sur l'écran d'accueil (iOS 16.4 et plus).
- Rappel d'enregistrement 24 h avant un vol, ajout d'une réservation par un autre participant.

### 7. Ouverture au public
- CGU et politique de confidentialité, avec la liste des sous-traitants : Supabase, Vercel, Open-Meteo, SMTP, IA.
- Gestion des quotas et des coûts, nom de domaine, page d'accueil.

### Plus tard
- Bilan annuel des voyages (« Wrapped »).
- Souvenirs automatiques (« il y a un an »).
