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

## Feuille de route conseillée

### 1. Consolider (court, avant d'inviter du monde)
- [x] Modifier ou supprimer une réservation, modifier un voyage (titre, dates, budget), réordonner les étapes.
- [ ] **Supabase CLI** (à faire par Karl, voir [docs/supabase.md](docs/supabase.md) § Faire évoluer la base) : relier le projet une fois, puis appliquer les prochaines migrations en ligne de commande et générer les types TypeScript.
- Projet gratuit : Supabase **met en pause** un projet sans activité pendant 7 jours. À surveiller, ou passer en offre payante à l'ouverture.

### 2. Billets PDF
- Joindre un PDF ou une capture à une réservation : le bucket `trip-files` et ses règles de sécurité sont prêts.
- Consulter le billet hors ligne (le vrai QR code à l'embarquement).
- C'est la base de l'étape suivante.

### 3. Import automatique par l'IA (la fonction phare)
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
