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
- [x] **Redirect URLs** réglées (Vercel + localhost), confirmé par Karl le 26/10. À compléter avec `https://tripmates.app/**` lors du passage sur ce domaine.
- [x] Les e-mails arrivaient en spam : réglé en passant les modèles en français (Karl, 26/10).
- [ ] Test complet à deux sur iPhone : installation, connexion, invitation, ajout de réservations par chacun.
- [ ] Sur iPhone 14 Pro (iOS 26 ?) : voile clair sous la barre d'état d'un voyage. Correctif en ligne (couleur de la couverture), à confirmer.

### Pour reprendre (mis à jour le 24/10)
- Tout est sur `main`, mis en ligne par Vercel : billets PDF, import par l'IA (billets et e-mails), tirer pour actualiser.
- Import par l'IA en service ; domaine **tripmates.app** (adresses d'import), relais Cloudflare `voyages-email`, fonctions Supabase `extract-booking` et `inbound-email` ([docs/import-ia.md](docs/import-ia.md)).
- À tester sur iPhone : tirer pour actualiser ; lecture d'un billet PDF ; mode avion puis réouverture d'un billet ; modifier un voyage, une réservation, l'ordre des étapes.
- Sur un nouveau poste ou dossier : `npm install` avant tout (sinon la compilation et `npm run test:db` échouent).
- Évolution de la base : nouveau fichier dans `supabase/migrations/`, `npm run test:db`, puis `npx supabase db push`, puis régénérer les types. Fonctions : `npm run test:functions`, puis `npx supabase functions deploy <nom>`.
- Prochaine étape conseillée : **4. Photos et souvenirs**.

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

- **Tirer pour actualiser** (fusionné dans `main` le 24/10) : en haut d'une page, tirer vers le bas puis relâcher recharge voyages, imports et profil. Le geste est ignoré quand un panneau est ouvert, sur le globe et pour les gestes horizontaux ; hors ligne, il affiche « Hors ligne ». Vérifié avec des gestes simulés, à confirmer sur l'iPhone.

### Mise en route (faite le 24/10)
- [x] Domaine **tripmates.app** acheté chez Cloudflare. `karlduponchel.fr` n'est pas utilisé : ses MX servent à la boîte `contact@`.
- [x] Migration appliquée (`db push`), secrets `ANTHROPIC_API_KEY` et `INBOUND_SECRET`, fonctions `extract-booking` et `inbound-email` déployées.
- [x] Relais `voyages-email` déployé, Email Routing actif sur `tripmates.app` (catch-all → relais).
- [x] Types de la base régénérés ; branches `feat/import-ia` et `feat/pull-to-refresh` fusionnées dans `main`.

### Reste à vérifier
- [x] **A** : lecture d'une capture de billet testée par Karl le 24/10 (fonctionne). Reste à tester avec un PDF.
- [x] **B** : e-mail easyJet transféré et validé le 24/10 (réservation « Paris CDG → Le Caire SPX » ajoutée avec son PDF). Premier essai bloqué : le secret du relais avait été enregistré sous un mauvais nom, il a été recréé.
- [x] Relais redéployé avec `workers_dev = false` (24/10) : plus d'adresse web publique, il ne reçoit que les e-mails.
- [x] Modèle choisi : **Haiku 5.5** depuis le 26/10 (secret `EXTRACT_MODEL=claude-haiku-5-5`). Avec Opus 5.5, c'était environ 0,03 $ par capture et 0,04 $ par e-mail ; Haiku est environ 40 fois moins cher. À surveiller : la qualité de lecture sur les prochains billets (pour revenir à Opus, supprimer le secret).

## Session du 26 octobre 2026

### Retours de Karl (tests sur iPhone)
- Lecture d'un billet PDF par l'IA : OK. Billet ouvert en mode avion : OK. Modifications (voyage, réservation, étapes) : OK.
- Tirer pour actualiser : l'animation se voit, mais on ne sent pas qu'on tire la page.

### Fait (fusionné dans `main` le 26/10)
- **Tirer pour actualiser** : le contenu de la page descend maintenant avec le doigt (avec résistance), puis remonte en douceur. La barre d'onglets et le bouton flottant ne bougent pas.
- **Zoom dans un billet** : pincer zoome seulement le document (jusqu'à 5×), pas toute la page. Un doigt déplace le document zoomé, un double tap zoome à 2,5× ou revient à la taille normale. Les PDF sont dessinés en résolution doublée pour que le QR code reste net.
- **Suppression d'un voyage** : déplacée dans « Modifier le voyage » (crayon), réservée au propriétaire. La confirmation dit ce qui sera effacé (réservations, fichiers joints, pour combien de voyageurs). Le panneau « Voyageurs » garde « Quitter le voyage ».
- Vérifié avec des gestes simulés. Le ressenti du tirage et du pincement reste à confirmer sur l'iPhone.
- Ajouts de Karl le 26/10 : Vercel Analytics et Speed Insights (`src/main.tsx`). À citer dans la future politique de confidentialité.

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

### Idées ajoutées par Karl le 26/10

#### Onboarding : installer l'app sur l'écran d'accueil
- **Quand** : à la première ouverture dans le navigateur, une seule fois par appareil, pas à chaque actualisation.
- **Comment ne pas le remontrer** : le choix est gardé sur le téléphone (stockage local). « Plus tard » le repropose après quelques jours, la croix le ferme pour de bon.
- **Jamais dans l'app déjà installée** : en mode plein écran, on sait qu'elle est installée (`display-mode: standalone`, `navigator.standalone` sur iPhone).
- **Contenu** : un panneau du bas, avec une icône, deux lignes sur les avantages (plein écran, hors ligne, plus tard les notifications), puis des étapes numérotées avec les icônes réelles.
- **Étapes selon l'appareil** :
  - iPhone sous Safari : menu, Partager, « Sur l'écran d'accueil », Ajouter ;
  - iPhone avec un autre navigateur : ouvrir dans Safari ;
  - Android : le bouton d'installation du navigateur (`beforeinstallprompt`) quand il est disponible.
- **Après l'installation** : rappeler qu'il faut se reconnecter une fois dans l'app installée, puisqu'elle ne partage pas sa session avec Safari.
- **Réutiliser** les étapes déjà présentes dans Profil (« Installer sur l'iPhone ») pour ne pas les maintenir deux fois.
- Modèle visuel : la capture de WikiMasters envoyée par Karl (panneau du bas, étapes 1 à 5, « Plus tard »).

#### Comptes « premium »
- **Ce qu'ils débloquent** :
  - les fonctions qui coûtent de l'argent : lecture par l'IA des billets et des e-mails transférés ;
  - plus de stockage : photos, documents (à préciser avec Karl).
- **Gratuit** (orientation validée par Karl le 26/10, chiffres proposés à confirmer) :
  - **IA** : 5 lectures offertes au total, billets et e-mails confondus, pour essayer.
  - **Photos** : dans 2 voyages maximum, 250 Mo au total. Avec des photos compressées avant l'envoi (environ 2 000 px, environ 400 Ko), cela fait environ 600 photos.
  - **Billets et documents** : non comptés dans ce quota, avec un garde-fou d'environ 50 Mo.
- **Premium** (proposé) :
  - IA « illimitée », avec un plafond contre les abus (environ 300 lectures par mois) ;
  - photos dans tous les voyages, 20 Go.
  - Prix envisagé : 2 à 3 € par mois ou environ 20 € par an. Coûts : environ 0,001 $ par lecture avec Haiku 5.5, et environ 0,02 $ par Go et par mois de stockage au-delà de l'offre Supabase Pro.
- **Voyage partagé : le propriétaire paie** (validé par Karl le 26/10) :
  - si le propriétaire est premium, tous les membres ont la lecture par l'IA dans ce voyage ;
  - les photos de tous les membres comptent dans le stockage du propriétaire ;
  - les e-mails transférés comptent sur le compte de celui qui transfère, car à la réception on ne sait pas encore à quel voyage ils iront.
- **Base de données** :
  - une table d'abonnements (offre, statut, date de fin) ;
  - les fonctions `extract-booking` et `inbound-email` vérifient l'offre côté serveur, en remplaçant ou en complétant la limite actuelle de 40 lectures sur 24 h ;
  - le quota de stockage est contrôlé à l'envoi d'un fichier.
- **Paiement** : Stripe Checkout et le portail client Stripe, avec une Edge Function qui reçoit ses webhooks. L'app est une PWA, hors App Store, donc sans commission Apple.
- **Juridique** : CGV, TVA (Stripe Tax), et une mention dans la politique de confidentialité. À regrouper avec l'étape 7.

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
