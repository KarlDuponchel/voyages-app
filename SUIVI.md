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

### Ouverture au public : où on en est (mis à jour le 02/11, nuit)
**L'app est ouverte au public sur `https://tripmates.app`** : plus de code d'accès, création de compte libre, usage gratuit possible. **Pas encore de vente du Premium** : les points « avant le premier vrai paiement » ci-dessous ne sont pas réglés. D'ici là : proches et testeurs, Premium offert à la main, pas de promotion.

**Fait le 02/11**
- Design Tripmates, accueil public, pages légales, logo, e-mails de connexion ; tout est sur `main`.
- Hébergement sur le VPS OVH avec Dokploy, derrière Cloudflare : certificat d'origine Cloudflare (Full strict), redirection de `www`.
- Supabase : migration et fonctions de la suppression de compte déployées ; `billing` redéployée par Karl avec l'acceptation des CGV ; **URL Configuration** (Site URL et Redirect URLs sur `tripmates.app`) et **modèles d'e-mails** (Magic Link, Confirm signup) réglés par Karl.
- Stripe : compte activé (Karl Duponchel EI, nom public Tripmates, libellé `TRIPMATES.APP`), adresse des CGV renseignée, portail client (résiliation en fin de période).
- Pages légales complètes sauf le médiateur ; acceptation des CGV à la connexion ; Umami en service sur `stats.tripmates.app`.

**Avant le premier vrai paiement** (dans cet ordre)
1. **Médiateur de la consommation** : obligatoire pour vendre à des particuliers (amende jusqu'à 15 000 €). Adhérer (CM2C, Médicys, AME Conso…), puis donner nom, adresse et site à Claude pour l'article 14 des CGV.
2. ~~**Open-Meteo remplacé par notre propre base de villes**~~ : **en ligne le 03/11** (décision de Karl ; détail dans [docs/lieux.md](docs/lieux.md)). Historique :
   1. ~~appliquer la migration `20261103110000_lieux.sql`~~ et ~~charger les villes~~ : **faits le 03/11 par Claude** (226 024 lieux, 241 804 noms, 71 Mo). Recherches vérifiées en ligne.
   2. ~~appliquer `20261103120000_lieux_rapide.sql`~~ : **fait le 03/11 par Claude**, avec l'accord de Karl. Mesuré en ligne : de 1 à 31 ms par recherche (contre 200 à 850 ms), mêmes résultats.
   3. ~~Deploy dans Dokploy~~ : fait par Karl le 03/11 ; l'app en ligne appelle `search_places`, Open-Meteo n'est plus utilisé (vérifié par Claude).
3. **Supabase Pro** (25 $ par mois, 100 Go de stockage) : l'offre gratuite plafonne le stockage à 1 Go pour tout le projet, alors que le Premium promet 20 Go par abonné.
4. **Stripe en réel** :
   - en mode réel : produit Premium et ses deux prix (2,50 €/mois, 20 €/an), webhook vers `https://qpxcaywcslayfmcjcpgw.supabase.co/functions/v1/stripe-webhook` avec les 4 événements (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`) ;
   - e-mail avant le renouvellement et reçus (Settings → Billing → Subscriptions and emails) ;
   - **vérifier que les secrets Supabase contiennent bien les clés réelles** (`sk_live_…`, `whsec_…` réel, prix réels) : avec les clés de test, le bouton Premium accepte la carte de test `4242…` et donne le Premium sans paiement ;
   - effacer les abonnements de test (`delete from subscriptions where status <> 'offert';`) ;
   - un vrai paiement avec sa carte, puis remboursement et résiliation ; le profil doit repasser en gratuit.

**À régler rapidement, même en gratuit**
- **Déploiement automatique de Dokploy** : un push sur `main` ne déclenche pas de déploiement (constaté deux fois le 02/11) ; vérifier « Auto Deploy » et le webhook GitHub (Settings → Webhooks du dépôt).
- **Cloudflare → Caching → Browser Cache TTL → « Respect Existing Headers »** : sinon les fichiers (service worker des notifications, icônes) restent jusqu'à 4 heures en cache chez les visiteurs.
- **Test complet d'un nouvel utilisateur** sur iPhone, avec une adresse neuve : e-mail reçu et code, installation sur l'écran d'accueil, un voyage, un billet, puis suppression du compte (vérifier dans Supabase que ses fichiers ont disparu).
- **Réinstaller l'app** sur les téléphones de Karl et Louna depuis `tripmates.app`, puis réactiver les notifications ; rediriger puis fermer l'ancienne adresse Vercel ([docs/hebergement.md](docs/hebergement.md), bascule).
- ~~**E-mails**~~ : **fait le 02/11 par Karl** : expéditeur `noreply@tripmates.app` (domaine vérifié dans Resend) et redirection `contact@tripmates.app` (Cloudflare Email Routing).
- ~~**Google Search Console**~~ : **fait le 02/11 par Karl** (propriété `tripmates.app`, sitemap envoyé). Reste, au choix : Bing Webmaster Tools, par import depuis Search Console. Le référencement a été vérifié en ligne le 02/11 : sitemap (4 pages), `robots.txt` (app exclue), URL canonique, Open Graph, données structurées, `noindex` sur l'app.

### Engagements des pages légales et obligations, par ordre d'importance (02/11)
Ce que les CGV, la politique de confidentialité ou les licences promettent, et qui n'est pas encore fait.
1. **Médiateur de la consommation** — *avant le premier paiement réel*. Obligatoire pour vendre à des particuliers (amende jusqu'à 15 000 €). Adhérer (CM2C, Médicys, AME Conso…), puis donner nom, adresse et site à Claude pour l'article 14 des CGV.
2. ~~**Open-Meteo : usage commercial**~~ — *réglé et en ligne le 03/11 (base de villes GeoNames chez nous)* — L'API gratuite de recherche de ville est réservée à l'usage non commercial, et une app avec abonnement est commerciale (conditions d'Open-Meteo, lues le 02/11). Choix à faire par Karl : formule payante Open-Meteo (« API Standard »), ou autre service de recherche de ville (à étudier par Claude : il faut le nom, le pays, les coordonnées et le fuseau horaire). Le crédit CC BY est affiché sous les résultats depuis le 02/11.
3. **Rappel avant le renouvellement annuel** (article L. 215-1 du Code de la consommation, promis par les CGV) — *avant la première souscription annuelle*. Stripe → Settings → Billing → Subscriptions and emails : activer l'e-mail avant renouvellement, et les reçus.
4. ~~**Mesure d'audience Umami**~~ — **en service le 02/11** sur `https://stats.tripmates.app` (Dokploy). Les deux valeurs `VITE_UMAMI_*` sont dans le `.env` du dépôt, comme les autres valeurs publiques. Vérifié par Claude : script chargé et visites envoyées depuis l'accueil et les pages légales.
5. **Droit d'accès et de portabilité** — *à la première demande* (réponse sous un mois). Au début, à la main : exporter les lignes de la personne (profil, voyages, réservations, photos) depuis Supabase. Plus tard : un bouton « Télécharger mes données » dans le profil.
6. **Préavis de 30 jours avant un changement de prix** (CGV, article 4) — *à chaque changement de prix*. Prévenir les abonnés par e-mail au moins 30 jours avant l'échéance concernée. Rien à coder tant que les prix ne bougent pas.
7. **Suppression des comptes inactifs depuis 3 ans** (politique de confidentialité) — *avant octobre 2029*. Tâche planifiée : avertir par e-mail un mois avant, puis supprimer avec `delete-account`.
8. **Nom commercial « Tripmates »** à déclarer à l'INPI (gratuit), puis l'ajouter aux mentions légales.
9. **Relecture par un juriste** des trois pages.

Fait le 02/11 : acceptation des CGV et de la politique de confidentialité indiquée sur l'écran de connexion (liens ouverts dans un nouvel onglet) ; Open-Meteo décrit correctement (OpenMeteo GmbH, Suisse, journaux 90 jours) et crédité ; Cloudflare décrit comme proxy du site.

### Pour reprendre (mis à jour le 03/11)
- **Tripmates est en ligne et ouvert au public** sur https://tripmates.app (VPS OVH avec Dokploy, derrière Cloudflare). Tout est sur `main`. État détaillé et prochaines étapes : « Ouverture au public : où on en est », juste au-dessus.
- **Pas encore de vente du Premium** : il manque le médiateur de la consommation et Supabase Pro (voir la liste « Avant le premier vrai paiement »).
- **Déploiement** : un push sur `main` ne se déploie pas tout seul (déploiement automatique de Dokploy à réparer) : cliquer sur Deploy dans Dokploy après chaque push.
- **Fait le 03/11** (en plus de la séance du 02/11) :
  - **recherche de villes dans notre propre base** (GeoNames, 226 024 lieux) au lieu d'Open-Meteo : en ligne, de 1 à 31 ms par recherche ; voir [docs/lieux.md](docs/lieux.md) ;
  - bouton « Passer Premium » quand l'offre gratuite bloque l'ajout de photos (seulement pour le propriétaire du voyage) ;
  - « Gérer l'abonnement » affiché seulement avec un abonnement en cours (un client Stripe existe dès qu'un paiement est commencé) ;
  - **barre d'onglets** plus basse, réduite à une pilule d'icônes au défilement vers le bas et remise en grand en remontant ;
  - **animations de la page d'accueil** : haut de page à l'ouverture, blocs qui apparaissent au défilement ;
  - balises iPhone sur la page d'accueil, pour que l'app installée depuis cette page s'ouvre en plein écran ;
  - acceptation des CGV sur l'écran de connexion ; e-mails de connexion et d'inscription aux couleurs de l'app ; Umami en service ; pages légales complètes sauf le médiateur.
  - **En attente d'un Deploy** (poussés, pas encore en ligne le 03/11) : barre d'onglets, animations de l'accueil, « Gérer l'abonnement ».
- **Corrigé le 03/11 (après-midi)** :
  - **« Gérer l'abonnement » répondait « Paiement indisponible »** : la case d'acceptation des CGV (commit c50f31d) avait été ajoutée à l'appel du portail client au lieu de celui du paiement. Stripe refusait le portail, et **le paiement ne demandait pas l'acceptation des CGV ni la renonciation au délai de rétractation**. Remis à sa place dans `billing`, **redéployée le 03/11 par Claude**. À tester sur iPhone : un paiement (la case doit apparaître) et « Gérer l'abonnement ».
  - **Boutons flottants** (« Nouveau voyage », ajout de réservation, ajout de photos) : ils descendent avec la barre d'onglets réduite, pour garder le même écart (classe `tabbar-reduite` sur la page).
  - **Accueil sur ordinateur** (demande de Karl) : « Ouvrir l'app » et les autres boutons vers l'app affichent une fenêtre avec un QR code vers `tripmates.app/monde`, au lieu d'ouvrir l'app, pensée pour le téléphone. « Continuer sur cet ordinateur » ouvre l'app quand même. Sur téléphone et tablette (écran tactile), rien ne change.
    - **Fenêtre plutôt qu'une page**, pour le référencement : pas de page presque vide à indexer, et les boutons restent de vrais liens vers `/monde` pour les moteurs et sans JavaScript. Le QR code est un SVG écrit dans `index.html` (aucune bibliothèque chargée) ; pour le refaire : `npx qrcode -t svg -e M -q 0 -d 183F37 -l 0000 "https://tripmates.app/monde"`.
  - **Pays dans la recherche de lieux** (demande de Karl, pour « Islande ») : migration `20261103130000_pays.sql` et fichier `900-pays.sql` de `scripts/lieux/preparer.mjs`, détail dans [docs/lieux.md](docs/lieux.md). 2 tests de base en plus. **Base en ligne le 03/11** (migration appliquée, 246 pays chargés, recherches vérifiées en ligne) ; l’app affiche « Pays » après le Deploy dans Dokploy.
  - **Îles et régions dans la recherche** (demande de Karl, « Minorque ») : 12 251 îles connues et 3 849 régions, **en ligne côté base le 03/11** (migration appliquée, chargées, recherches vérifiées), migration `20261103140000_iles_regions.sql` (sorte gardée sur chaque étape : `place_kind`), détail dans [docs/lieux.md](docs/lieux.md). 2 tests de base en plus.
  - **Ajout de photos lent sur iPhone** (12 photos, « Ajouter » appuyé 15 fois) : l'app reçoit les fichiers seulement quand iOS a fini de les préparer (conversion HEIC en JPEG, téléchargement depuis iCloud, vidéos recompressées). **Fait** : le choix de photos demande le HEIC tel quel (`MEDIA_ACCEPT` dans `src/lib/media.ts`), l'app le réenregistre en JPEG. **À tester sur iPhone** : ajouter 10 à 12 photos d'un coup et comparer l'attente après « Ajouter ».
  - **Couvertures par thème** (demande de Karl) : 8 photos d'ambiance (ville, plage, montagne, neige, nature, campagne, lac, désert) pour les voyages sans photo de couverture, devinées d'après la première étape (Minorque : plage) et modifiables à la création et dans « Modifier le voyage ». Migration `20261103150000_couverture_theme.sql` **appliquée en ligne le 03/11**, détail et crédits dans [docs/couvertures.md](docs/couvertures.md).
  - Aperçu local avec le faux Supabase : configurations `faux-supabase` et `voyages-mock` dans `.claude/launch.json` (fichier `.env.mock.local` à créer, voir « Accueil public »).
- **À vérifier sur iPhone** après le Deploy :
  - l'app installée depuis la page d'accueil s'ouvre bien en plein écran, sans les barres de Safari (constaté par Karl le 03/11 avec l'ancienne installation) ;
  - la barre d'onglets réduite et les animations de l'accueil sont fluides.
- **Fonctions à venir** (feuille de route) : budget partagé, rappels (veille d'un vol, réservation ajoutée par un autre), bouton « Télécharger mes données ».

### Pour reprendre (28/10, fin de soirée)
- **Tout est sur `main`**, mis en ligne par Vercel, et déployé côté Supabase et Cloudflare. Aucune branche en attente.
- **En service** :
  - billets PDF ; import par l'IA (billets et e-mails, Haiku 5.5) ; notifications « e-mail analysé » ;
  - **photos et vidéos** (compressées sur le téléphone, couvertures) ; **« Revivre »** ; menu « Ajouter au voyage » ;
  - tirer pour actualiser, zoom dans les billets, onboarding d'installation, Vercel Analytics.
- **Docs** : [import-ia.md](docs/import-ia.md), [notifications.md](docs/notifications.md), [supabase.md](docs/supabase.md), [prompt-maquettes.md](docs/prompt-maquettes.md).
- **Commandes** : base `npm run test:db`, puis `npx supabase db push`, puis régénérer les types ; fonctions `npm run test:functions`, puis `npx supabase functions deploy <nom>` ; relais `npm test`, puis `npx wrangler deploy` dans `email-worker`. Si Deno signale des types `any` inattendus : `npx -y deno@2.9.6 clean`. Claude ne peut pas écrire les secrets : c'est Karl qui les règle.

### La suite, dans l'ordre (décidée le 28/10)
1. **Tester « Revivre » sur l'iPhone** (Karl) : stories, son des vidéos, appui long, glisser pour fermer.
2. **Test à deux avec Louna** (Karl) : invitation, puis chacun ajoute billets et photos. Tout le partage n'a encore jamais été vécu à deux.
3. **Direction artistique** : maquettes « Wayfarer » livrées par Karl le 02/11 dans `figma_mockups/`. **Prochaine séance** : les appliquer, en suivant l'étape 8 de la feuille de route (« Nouvelle direction artistique »).
4. **Comptes premium** :
   - **gratuit** : 5 lectures par l'IA, photos dans 2 voyages et 250 Mo (300 à 400 photos) ;
   - **premium** : 20 Go, IA presque illimitée ;
   - le propriétaire d'un voyage paie pour tous ;
   - paiement par Stripe (Checkout et portail client, webhook dans une Edge Function) ;
   - quotas vérifiés côté serveur (fonctions de lecture, envoi des photos) ;
   - affichage de la place utilisée dans le profil.
5. **Budget partagé** : dépenses, qui a payé quoi, soldes.
6. **Rappels** : notification la veille d'un vol (enregistrement), réservation ajoutée par un autre participant. Les notifications sont déjà en place ; il faudra une tâche planifiée.
7. **Ouverture au public** : l'app sur `tripmates.app` (et ce domaine dans les Redirect URLs de Supabase), le nom définitif, les CGU et la politique de confidentialité (photos, IA, analytics), Supabase Pro et Vercel Pro, et la révision des textes des notifications.

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
- Testé sur iPhone par Karl le 26/10 : zoom du billet, tirer pour actualiser et suppression d'un voyage fonctionnent parfaitement.
- Ajouts de Karl le 26/10 : Vercel Analytics et Speed Insights (`src/main.tsx`). À citer dans la future politique de confidentialité.

### Onboarding d'installation (en ligne le 26/10)
- **Quand** : un panneau « Installez Voyages » apparaît à la première ouverture dans le navigateur, y compris avant la connexion : mieux vaut installer l'app puis se connecter dedans.
- **Retenu par appareil** : « Plus tard » (ou fermer le panneau) le repropose dans 7 jours, « Ne plus afficher » jamais.
- **Jamais** dans l'app installée, ni sur ordinateur.
- **Étapes selon l'appareil** : Safari sur iPhone (Partager, « Sur l'écran d'accueil », Ajouter) ; autre navigateur sur iPhone (avec le conseil d'ouvrir dans Safari) ; Android, avec le bouton « Installer l'app » quand le navigateur le propose, sinon par le menu.
- **Profil** : la section « Installer l'app » réutilise les mêmes étapes, et affiche « L'app est installée » dans l'app installée.
- Vérifié dans le navigateur en se faisant passer pour un iPhone et pour un Android. À tester sur l'iPhone, en ouvrant l'adresse de l'app dans Safari.

### Import d'e-mail sans réservation trouvée (corrigé et déployé le 26/10)
- **Constat** : e-mail PerfectStay transféré (hôtel Yotel New York du 14 au 21/11), réponse « aucune réservation ». Haiku n'a reçu que le texte de l'e-mail (environ 3 700 tokens), qui ne contient ni dates ni hôtel. Le bon d'échange PDF ne lui a pas été transmis. Lu directement depuis le voyage, ce même PDF a bien été reconnu par Haiku.
- **Cause probable** : le relais n'acceptait que les pièces jointes déclarées « PDF » ou « image ». Les PDF déclarés « application/octet-stream », les photos en « image/jpg » et les messages transférés en pièce jointe étaient écartés.
- **Corrigé** :
  - le relais reconnaît le type à l'extension et au contenu, et ouvre les messages transférés en pièce jointe (`email-worker/src/attachments.ts`, 4 tests avec le vrai bon d'échange : `npm test` dans `email-worker`) ;
  - même reconnaissance côté fonction serveur ;
  - message d'erreur plus clair quand aucune pièce jointe n'est lisible ;
  - journaux du relais conservés (`[observability]`) : on voit les pièces jointes reçues, transmises et écartées.
- **Déployé le 26/10** : relais et fonctions `inbound-email` et `extract-booking`. Vérifié par Karl : l'e-mail PerfectStay retransféré est bien passé.

### Notifications : e-mail analysé (en ligne le 26/10, testé sur iPhone par Karl)
- **Demande de Karl** : être prévenu sur le téléphone quand un e-mail transféré a été analysé, avec un lien vers les réservations à valider.
- **Fait** :
  - après l'analyse, `inbound-email` envoie une notification, par exemple « Nouvelle réservation à valider · Yotel New York », ou « rien trouvé ». Un appui ouvre « E-mails à valider » ;
  - activation dans Profil → Notifications, et une invitation sur l'écran « E-mails à valider » ;
  - à la déconnexion, le téléphone est retiré.
- **Textes** (ton « enthousiaste », choisi le 26/10, **à revoir avant l'ouverture au public**), dans `supabase/functions/_shared/push.ts` :
  - « ✈️ Une réservation vient d'atterrir · Yotel New York est prête à rejoindre votre voyage. Un coup d'œil ? »
  - « ✈️ 3 réservations débarquent · Vol aller, Vol retour et 1 autre : vérifiez, et c'est rangé. »
  - « 🤔 Rien à se mettre sous la dent · Pas de réservation dans « … ». »
- Phrase du profil une fois activées, rendue générale pour les futures notifications : « on vous prévient de ce qui compte pour vos voyages ».
- **Technique** : Web Push (clés VAPID, bibliothèque `@negrel/webpush`), table `push_subscriptions`, `public/push-sw.js`. Détails dans [docs/notifications.md](docs/notifications.md).
- **Tests** : sécurité de la table (5 tests), texte des notifications, envoi chiffré vers un faux service de notification.
- **Mise en route le 26/10** : clés générées par Karl (secret `VAPID_KEYS`, clé publique dans `.env`), migration appliquée, `inbound-email` déployée, mise en ligne. **Reste à faire** : activer dans l'app installée (Profil → Notifications), puis transférer un e-mail pour vérifier.

### Autres décisions et changements du 26/10
- **Modèle de lecture** : Haiku 5.5 (secret `EXTRACT_MODEL`), environ 40 fois moins cher qu'Opus 5.5.
- **E-mails de connexion** : ils ne tombent plus en spam depuis le passage des modèles en français.
- **Redirect URLs** : confirmées par Karl.
- **Textes des notifications** : ton « enthousiaste », provisoire, à revoir avant l'ouverture au public.
- **Comptes gratuit et premium** : règles et point d'équilibre notés dans la feuille de route (« Comptes premium »). Le propriétaire d'un voyage paie pour tous ses membres.
- **Photos : rester sur l'offre gratuite de Supabase pendant le développement.**
  - Utilisation au 26/10 : 2,7 Mo de fichiers sur 1 Go, et 12 Mo de base sur 500 Mo.
  - 1 Go représente environ 2 500 photos compressées, et 5 Go de trafic par mois suffisent à deux.
  - À surveiller : la mise en pause après 7 jours sans activité (il suffit d'ouvrir l'app chaque semaine, la réactivation se fait en un clic) et le plafond de 1 Go.
  - Passage au Pro sans rien changer au code, juste avant l'ouverture au public.

## Session du 28 octobre 2026

### Fait
- **Prompt de maquettes** pour Figma Make et Claude Design : [docs/prompt-maquettes.md](docs/prompt-maquettes.md). Il reprend les couleurs actuelles en variables à modes (sombre, clair), plus trois palettes alternatives à comparer, et 14 écrans, dont Photos et Souvenirs.
- **Photos et vidéos d'un voyage, livraison A** (en ligne le 28/10) :
  - **Onglet Photos** : grille groupée par jour de prise de vue (lue dans la photo), badge de durée sur les vidéos. Le bouton flottant « + Photos » ajoute plusieurs éléments d'un coup, avec la progression (« Envoi 3 sur 12 · compression 40 % ») et les erreurs.
  - **Photos** : réduites à 2 048 px, réenregistrées en JPEG (le lieu GPS est effacé), avec une miniature d'environ 50 Ko. Qualité passée de 0,82 à 0,75 le 28/10, après mesure sur de vraies photos (0,5 à 1 Mo à 0,82).
  - **Première vraie vidéo** (iPhone, 28/10) : bien compressée par Safari, en MP4 960 × 1 280, 2,5 s pour 0,55 Mo (environ 13 Mo par minute).
  - **Vidéos** : recompressées sur le téléphone en 720p H.264 avec Mediabunny ; 30 Mo au plus après compression, 3 minutes au plus. Mediabunny n'est chargé qu'au premier envoi de vidéo et n'est pas dans le cache hors ligne.
  - **Visionneuse plein écran** : glisser d'un élément à l'autre, zoom au pincement, vidéos en lecture, « Ajoutée par … · date », mettre en couverture, partager ou enregistrer, supprimer (l'auteur ou le propriétaire).
  - **Couvertures** : la photo choisie remplace le dégradé dans l'en-tête du voyage, la liste des voyages et Souvenirs (stories, « Il y a 1 an », grille). Le nombre de photos est réel.
  - **Hors ligne** : les miniatures et les photos déjà ouvertes restent sur le téléphone ; les vidéos se lisent avec du réseau.
  - **Suppression d'un voyage** : ses photos et vidéos sont effacées du stockage.
  - **Base** : migration `20261028100000_photos.sql` (table `trip_photos`, `trips.cover_photo_id`, bucket privé `trip-photos`). 63 tests de sécurité, dont 10 pour les photos.
  - **Vérifié** dans le navigateur : vraie compression d'une photo (4 000 px, 1,5 Mo → 2 048 px, 414 Ko) et d'une vidéo (1080p WebM avec son → MP4 720p, son conservé, 2 secondes pour 6 secondes de vidéo), grille, visionneuse et glissement. Un bug a été trouvé et corrigé : le bouton flottant était mal placé à cause de l'animation de l'onglet.
- **Ajout rapide** (demande de Karl) : dans un voyage, « + Ajouter » ouvre le menu « Ajouter au voyage » avec trois choix : billet ou réservation (lu par l'IA), photos et vidéos, saisie manuelle. Choisir des photos ouvre la pellicule tout de suite (dans le même geste, comme l'exige Safari), puis bascule sur l'onglet Photos qui les envoie.
- Miniatures : arrondi sur chaque image, et non plus sur la grille (corrigé après le retour de Karl).
- **« Revivre », livraison B** : diaporama plein écran façon stories.
  - Barres de progression, 4 s par photo avec un léger zoom lent, vidéos jouées jusqu'au bout (30 s au plus), bouton pour le son.
  - Appui à droite ou à gauche pour avancer ou reculer, appui long pour la pause, glisser vers le bas pour fermer.
  - Fin du voyage avec « Revoir » et « Voir les photos ».
  - **Accès** : stories de Souvenirs (si le voyage a des photos), carte « Il y a 1 an » ou « Dernier voyage », bouton « Revivre » de l'onglet Photos.
  - Le « + » de Souvenirs (qui annonçait encore « bientôt ») demande maintenant le voyage, puis ouvre son onglet Photos (`?onglet=photos`).
  - Petites corrections : « Égypte, Égypte » devient « Égypte » quand le titre et le pays sont identiques ; pluriels de « photo » et « voyage ».
  - Vérifié dans le navigateur avec des gestes simulés ; le ressenti sur iPhone reste à confirmer.

### À faire pour mettre en ligne
- [x] Migration photos appliquée (par Karl), types régénérés, requête des voyages vérifiée sur la vraie base, `feat/photos` fusionnée dans `main` (28/10).
- [ ] Tester sur iPhone : choisir plusieurs photos et une vidéo dans la pellicule, la date de prise de vue, mettre en couverture, supprimer, l'affichage hors ligne.

## Session du 2 novembre 2026

### Décisions de Karl
- **Partage public** des photos et vidéos : elles restent privées par défaut, et l'auteur peut les rendre publiques. Chacune est rattachée à une ville.
- **Réactions** : J'aime ❤️, J'adore 😍, Waouh 🤩 et **Wishlist** 🧳 (l'anglicisme est voulu).
- **Ordre de travail** : finir ce qui est ouvert, la base du partage, Photos C (quotas et premium), puis les étapes A, B, C et D du partage.
- **Choix par défaut de Claude**, à confirmer :
  - une photo publique est visible des utilisateurs connectés seulement, sans lien public ;
  - l'auteur apparaît avec son prénom ;
  - on montre le mois de prise de vue, pas le jour ;
  - pas de commentaires.

### Fait (fusionné dans `main` et en ligne le 02/11)
- **Ce qui restait ouvert** : uniquement des vérifications sur iPhone, regroupées plus bas dans « À tester sur iPhone ».
- **Base du partage** : migration `20261102100000_partage.sql`.
  - L'auteur publie dans une ville du voyage.
  - Les autres voient la photo, la ville, le mois et le prénom de l'auteur, jamais le voyage.
  - Dépublier est immédiat : aucun fichier n'est copié.
  - Une réaction par personne.
- **Photos C, quotas et premium** : migration `20261102110000_premium.sql`.
  - **Gratuit** : 5 lectures par l'IA, photos dans 2 voyages, 250 Mo. **Premium** : 300 lectures sur 30 jours, 20 Go.
  - **Le propriétaire paie pour tous.**
  - **Contrôles côté serveur** : poids réel des fichiers stockés, et `ai_allowance` dans `extract-booking` et `inbound-email`.
  - **Paiement Stripe** : fonctions `billing` (paiement et portail client) et `stripe-webhook`.
  - **Profil** : carte « Offre » avec la place utilisée et les lectures restantes.
  - **Envoi des photos** : le quota est vérifié avant l'envoi. Si c'est plein, un seul message, avec « Voir l'offre ».
- **A. Rendre publique** (visionneuse d'un voyage) :
  - choix de la ville et légende publique ;
  - case « j'ai pris cette photo, les personnes reconnaissables sont d'accord » ;
  - badge 🌍 sur les miniatures ;
  - « Retirer du public » pour l'auteur ou le propriétaire.
- **B. Modération** :
  - signalement avec un motif, et masquage automatique à 3 personnes ;
  - blocage d'un utilisateur, dans les deux sens ;
  - au plus 30 publications par jour ;
  - marche à suivre pour Karl dans [docs/partage.md](docs/partage.md).
- **C. Explorer**, nouvel onglet :
  - photos publiques récentes, filtre par ville, onglet Wishlist ;
  - visionneuse avec les réactions, « Signaler » et « Bloquer » ;
  - lien « Ce que les voyageurs ont vu à … » dans l'onglet Photos d'un voyage.
- **Accueil, « Les souvenirs de la communauté »** (demande de Karl), en bas de l'écran Monde :
  - les villes tendances, classées par l'activité des 30 derniers jours (publications et réactions) ;
  - une carte par ville : mosaïque de 1 à 4 photos, les plus appréciées d'abord, et le pays ;
  - les chiffres de chaque ville : photos, voyageurs, réactions, « +N ce mois-ci » ;
  - un appui ouvre Explorer sur la ville, et « Tout voir » ouvre Explorer ;
  - sans photo publique, un message invite à partager les siennes ;
  - fonction `public_trending_places`, qui respecte les blocages.
- **D. Notifications** : fonction `notify-reaction`, qui prévient l'auteur.
  - « 😍 Marie adore votre photo » ;
  - « ✨ Votre photo de Porto plaît : Marie, Tom et 2 autres ont réagi » ;
  - au plus une par heure et par photo.
- **Tests** :
  - 108 tests de sécurité de la base, contre 63 avant ;
  - 19 tests des fonctions serveur, contre 14 avant : signature Stripe, abonnements, messages.
- **Vérifié dans le navigateur** avec un faux Supabase :
  - Explorer, filtre par ville, Wishlist, réactions, signalement, blocage ;
  - publication et retrait ;
  - carte « Offre », en gratuit et en premium, en thème clair et sombre.
  - Corrigé en chemin : la rangée de boutons de la visionneuse débordait sur iPhone.

- **Code d'accès** (demande de Karl, en ligne le 02/11) :
  - le code est demandé avant l'app, même avant la connexion, une fois par appareil ;
  - l'app installée sur l'écran d'accueil le redemande une fois, car elle ne partage pas son stockage avec Safari ;
  - c'est un verrou de façade : les données restent protégées par la connexion et la sécurité de la base ;
  - seule l'empreinte du code est dans l'app ; pour le changer, voir `src/components/AccessGate.tsx` ;
  - le code est à donner aux personnes invitées ;
  - à retirer à l'ouverture au public.

### À faire par Karl pour mettre en ligne
- [x] **Base** : migrations appliquées et types régénérés le 02/11. Avec la CLI 3.0, il faut ajouter `--linked` à `db push`, sinon elle vise une base locale. Ceux de `src/data/database.types.ts` ont été écrits à la main en attendant.
- [ ] **Premium offert** à Karl et Louna. Sinon, l'offre gratuite s'applique dès la mise en ligne : 5 lectures par l'IA déjà consommées, et 2 voyages avec photos. La requête est dans [docs/partage.md](docs/partage.md).
- [x] **Stripe en mode test** : produit, deux prix, portail, webhook et secrets réglés par Karl le 02/11.
- [x] **Paiement de test** réussi le 02/11 (sandbox), après la correction de `STRIPE_SECRET_KEY` par Karl. La fonction `billing` montre l'erreur exacte de Stripe en mode test.
- [x] **Fonctions** déployées le 02/11. La CLI 3.0 demande `--yes` quand Claude déploie, après l'accord de Karl. Commande : `npx supabase functions deploy` pour `billing`, `stripe-webhook`, `notify-reaction`, puis `extract-booking` et `inbound-email`, qui ont changé.
- [x] `feat/partage` fusionnée dans `main` et en ligne le 02/11.

### À tester sur iPhone (tout ce qui reste ouvert)
- [ ] **Photos** : choisir plusieurs photos et une vidéo dans la pellicule, la date de prise de vue, mettre en couverture, supprimer, l'affichage hors ligne.
- [ ] **« Revivre »** : stories, son des vidéos, appui long, glisser pour fermer.
- [ ] **Test à deux avec Louna** : invitation, puis chacun ajoute des billets et des photos.
- [ ] **Billets** :
  - joindre un PDF et une capture ;
  - « Afficher le billet » ;
  - mode avion, puis réouverture.
  - L'app installée récupère bien le lecteur de PDF.
- [ ] **Installation** :
  - l'app installée se met à jour toute seule ;
  - le voile clair sous la barre d'état sur l'iPhone 14 Pro a disparu.
- [ ] **Partage** :
  - rendre publique une photo ;
  - la voir dans Explorer depuis le compte de Louna, et réagir ;
  - recevoir la notification ;
  - signaler, bloquer ;
  - la Wishlist.
- [ ] **Premium** : paiement test (carte `4242 4242 4242 4242`), retour sur le profil, « Gérer l'abonnement ».
- [ ] **Figma** (thème clair) : retouches de la barre d'état des écrans 02 et 06, du QR code du billet 03 et du texte « PORTUGAL · 7 JOURS ».

### Refonte du design (branche `feat/design-wayfarer`, 02/11 au soir, pas encore fusionnée)
- **Demande de Karl** : reprendre la typo et les couleurs de la maquette, adapter le style, **en laissant les blocs comme ils sont**. Donc 5 onglets gardés (avec Explorer), pas de « + » central.
- **Couleurs** (`src/theme/palettes.ts`) : palette Wayfarer en clair ; thème sombre selon la proposition de l'étape 8 (fond Deep Forest, cartes Forest, texte crème).
  - Nouvelles clés : `accentText` (corail foncé `#C4472B` pour le petit texte en clair), `textOnGradient` (texte sur les dégradés), `globeLandStroke`, `globeOutline`, `globeShade`, `glassBg`, `glassBorder`, `glassActive`, `shadowSoft`. `globeGlow` a disparu.
  - Le texte sur les boutons corail est blanc, comme dans la maquette.
- **Polices** : DM Serif Display (titres, chiffres, italique corail pour les mots en valeur) remplace Bricolage Grotesque ; DM Sans en 700 pour les petites capitales.
- **Style** : boutons en pilule (montent au survol, souris seulement), cartes Paper avec ombre douce, sur-titres en capitales espacées.
- **Écran Monde** : « BONJOUR, KARL » en corail, titre « Votre monde, *en un regard* », globe papier (terres sauge, pays visités en corail, repères bordés de blanc, onde sur le prochain voyage), orbites décoratives, chiffres en 3 colonnes à filets, prochain départ en carte Forest.
- **Barre d'onglets** en verre, flottante, avec le point corail sur l'onglet actif.
- **Couleurs en dur** de l'ancienne palette remplacées (visionneuses, couvertures, billet, Explorer, voile des panneaux).
- **Vérifié dans le navigateur** avec un faux Supabase, en clair et en sombre : Monde, Voyages, Voyage, Billet, Souvenirs, Explorer, Stats, Profil. Compilation OK.
- **Nom** : « Voyages » remplacé par **Tripmates** partout où il s'affiche (titre de l'onglet, app installée, connexion, code d'accès, installation, notifications, message d'invitation). Les clés de stockage gardent le préfixe `voyages:`, pour ne pas perdre les réglages des appareils.
- **Accueil, globe ou carte** (demande de Karl) : un sélecteur au-dessus du globe propose le globe qui tourne (par défaut) ou une mappemonde à plat (`src/components/WorldMap.tsx`, projection Equal Earth, mêmes couleurs, mêmes repères). Le choix est gardé sur l'appareil (`voyages:vue-monde`).
- **Pas encore fait** : captures avant et après sur iPhone, page d'accueil publique, icônes de l'app (toujours les anciennes).

### Accueil public et pages légales (branche `feat/design-wayfarer`, 02/11 dans la nuit)
- **Thème sombre désactivé** (Karl n'aime pas le fond vert) : `src/theme/theme.tsx` applique toujours le thème clair, et le choix « Apparence » a disparu du profil. La palette `sombre` reste dans `palettes.ts` pour un retour éventuel.
- **Nouvelle organisation des adresses** :
  - `/` est la page d'accueil publique (`index.html`, statique, référencée) ;
  - `/cgv`, `/mentions-legales`, `/confidentialite` sont les pages légales (`*.html` à la racine) ;
  - **l'app est dans `app.html` et commence à `/monde`** ; toutes les autres adresses (`/voyages`, `/invitation/…`) restent les mêmes.
  - Règles : `vercel.json` (`cleanUrls` et réécriture vers `app.html`), et le plugin `sitePages` de `vite.config.ts` pour `npm run dev` et `vite preview`.
  - **Avec Dokploy** : reproduire la règle dans nginx (`/` → `index.html`, `/cgv` → `cgv.html`, le reste sans extension → `app.html`).
  - L'app installée s'ouvrait sur `/` : l'accueil renvoie vers `/monde` l'app installée, et les personnes connectées sur téléphone. Le manifeste démarre désormais sur `/monde`. Le service worker ouvre `app.html` hors ligne.
- **Page d'accueil** (`index.html`, styles `src/site/site.css`) : d'après la maquette Figma. Héros « Chaque voyage laisse une trace », bandeau des fonctionnalités, 4 sections avec de vraies captures de l'app, 3 étapes, tarifs (2,50 €/mois, 20 €/an), questions fréquentes, citation, pied de page. Aucun faux chiffre d'utilisateurs.
  - **Captures** dans `public/accueil/` (WebP, ×2), faites avec des données de démo (Camille, Lisbonne & Porto). Les couvertures des voyages de démo sont des photos Unsplash libres de droits (Lisbonne, Kyoto, Islande, New York, Cyclades, Marrakech, Oaxaca), rangées dans `scripts/accueil/photos/` avec leurs crédits (`CREDITS.md`) ; elles habillent les sections 2 (itinéraire) et 4 (souvenirs). Pour les refaire : `node scripts/accueil/faux-supabase.mjs`, puis Vite en mode `mock` sur le port 5174 avec un `.env.mock.local` (`VITE_SUPABASE_URL=http://localhost:54399`), puis `node scripts/accueil/captures.mjs public/accueil`. `page.mjs` capture une page entière (image de partage `og.jpg` en 1200×630).
- **Premium affiché « lecture par l'IA illimitée »** (décision de Karl, 02/11), avec un astérisque : « usage raisonnable, jusqu'à 300 lectures par période de 30 jours », sur l'accueil et dans les CGV. Le plafond doit rester écrit près du mot « illimitée », sinon c'est une pratique commerciale trompeuse.
- **App, en-tête d'un voyage avec photo** : le fondu vers la crème commence plus haut et le sur-titre (« PORTUGAL · 8 JOURS ») passe en corail foncé ; en doré sur une photo claire, il était illisible.
- **Référencement** : titre et description, URL canonique, Open Graph et image de partage, données structurées `Organization`, `WebSite` et `WebApplication` (avec les prix), `robots.txt` (l'app est exclue), `sitemap.xml`, `noindex` sur `app.html`. Pas de balisage FAQ : Google ne l'affiche plus depuis mai 2026. La page ne charge que ses styles et ses polices (environ 20 ko de HTML), pas l'app.
  - **Après la mise en ligne** : déclarer le site et le sitemap dans Google Search Console et Bing Webmaster Tools.
- **Pages légales**, à faire relire par un juriste avant l'ouverture. Les informations manquantes sont surlignées en jaune (classe `todo`) :
  - identité de l'éditeur, statut, SIRET, adresse, directeur de la publication, régime de TVA ;
  - **médiateur de la consommation** (obligatoire pour vendre aux particuliers) ;
  - prestataire d'envoi des e-mails ; adresse de Supabase (dans son DPA) ; hébergeur du VPS au passage sur Dokploy ;
  - **créer la boîte `contact@tripmates.app`** (redirection Cloudflare Email Routing), citée partout.
- **Engagements écrits dans les pages, pas encore codés** :
  - rappel par e-mail avant le renouvellement de l'abonnement annuel (obligatoire, article L. 215-1) ;
  - prévenir 30 jours avant un changement de prix ;
  - suppression des comptes inactifs depuis 3 ans, avec un e-mail d'avertissement ;
  - exporter ses données sur demande (droit d'accès et de portabilité) : à la main au début.
- **Trouvé en écrivant la politique de confidentialité** : supprimer son compte laissait les fichiers des billets et des photos dans le stockage, et l'abonnement Stripe actif. (Les voyages dont la personne était seule membre, eux, étaient déjà supprimés par la base.) Corrigé par la fonction `delete-account`, voir « Suppression de compte complète » ; la politique de confidentialité décrit le nouveau fonctionnement.

### Idées pour la suite du partage
- **Globe** : un point par ville qui a des photos publiques, qui ouvre Explorer sur cette ville.
- **Vérification par l'IA à la publication** (Haiku, moins d'un centime par photo) : refuser d'emblée les contenus choquants.
- **Avant l'ouverture au public** :
  - page « Mes photos publiques » ;
  - CGU (licence d'affichage, droits, personnes photographiées) ;
  - point de contact pour le DSA.

## Suppression de compte complète (RGPD, 2 novembre 2026)

Découvert en écrivant la politique de confidentialité : supprimer son compte laissait des fichiers et l'abonnement.

### Constat
- **La base faisait déjà sa part** (déclencheur `after_member_removed`, schéma initial), vérifié par un test :
  - un voyage dont on était le seul membre est supprimé, avec ses réservations, étapes et photos ;
  - un voyage partagé reste aux autres ; si on en était propriétaire, le membre le plus ancien le devient (un participant avant un lecteur).
- **Ce qui manquait** :
  - les **fichiers** (billets `trip-files`, photos `trip-photos`, pièces jointes `imports`) restaient dans le stockage : Postgres ne peut pas les effacer ;
  - l'**abonnement Stripe** continuait d'être prélevé ;
  - le webhook Stripe aurait échoué en boucle sur un compte disparu.

### Fait (branche `claude/modest-poitras-1ed45c`)
- **Choix : une fonction serveur `delete-account`**, appelée par l'app à la place de la fonction de base `delete_my_account()`.
  - Seul le serveur, avec la clé serveur, peut effacer des fichiers de voyages dont on n'est pas forcément éditeur, résilier chez Stripe, puis supprimer le compte.
  - Écarté : effacer depuis l'app avant la suppression (une coupure laisse des fichiers, une vieille version de l'app les oublie) ; un nettoyage périodique des fichiers orphelins (des données restent des jours après la demande).
  - Ordre : résilier l'abonnement, effacer les fichiers, puis supprimer le compte. Une erreur arrête tout avant la suppression : on peut réessayer.
- **Migration `20261103100000_suppression_compte.sql`** :
  - `account_files(p_user)`, réservée au serveur, liste les fichiers à effacer : ceux des voyages dont la personne est la seule membre, y compris les envois interrompus, et ses pièces jointes d'e-mails ;
  - `delete_my_account()` est supprimée.
- **Voyages partagés** : leurs fichiers restent, comme les photos ajoutées par la personne, sans son nom.
- **Premium** : le nouveau propriétaire paie désormais pour tous. Les photos du voyage comptent dans son espace. S'il est en gratuit et dépasse la limite, les photos restent, mais on ne peut plus en ajouter (même règle qu'à la fin d'un premium). Il peut aussi faire tomber le voyage sous la limite gratuite des 2 voyages avec photos.
- **Webhook Stripe** : il ignore un abonnement dont le compte n'existe plus.
- **Tests** : 8 nouveaux tests de base (113 au total) et 2 tests de fonctions (21 au total).

### À faire par Karl pour mettre en ligne (dans cet ordre, rapprochés)
L'app actuelle appelle `delete_my_account()`, que la migration supprime. Faire les trois étapes à la suite. L'app n'est pas encore ouverte au public, donc le court intervalle est sans risque.
- [ ] Vérifier : `npm run test:db` et `npm run test:functions`.
- [x] Appliquer la migration (fait le 02/11 ; la CLI 3.0 dit maintenant `--remote` au lieu de `--linked`). Puis régénérer les types : les fonctions `account_files` et `delete_my_account` sont déjà corrigées à la main dans `src/data/database.types.ts`.
- [x] Déployer les fonctions `delete-account` (nouvelle) et `stripe-webhook` (modifiée), fait le 02/11. Pas de nouveau secret : elles utilisent `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_SECRET_KEY`, déjà réglés.
- [x] Mettre l'app en ligne (fusion dans `main`, le 02/11).
- [ ] Tester avec un compte jetable : un voyage seul avec un billet et une photo, un voyage partagé avec Louna. Supprimer le compte, puis vérifier dans le tableau de bord que les fichiers du voyage seul ont disparu des buckets, et que Louna est propriétaire du voyage partagé.

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

#### Onboarding : installer l'app sur l'écran d'accueil — fait et en ligne le 26/10
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
  - **Photos** : dans 2 voyages maximum, 250 Mo au total. Mesuré le 28/10 sur de vraies photos d'iPhone : 0,5 à 1 Mo par photo à la qualité 0,82, passée à 0,75 (environ 25 % de moins). 250 Mo représentent donc environ **300 à 400 photos**, jugé correct par Karl pour le gratuit.
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
- **Point d'équilibre** (estimation du 26/10) :
  - **Frais fixes à l'ouverture** : Supabase Pro 25 $ + Vercel Pro 20 $ (obligatoire, l'offre Hobby interdit l'usage commercial) + domaine environ 1 € = **environ 43 € par mois**. Cloudflare reste gratuit. L'IA (Haiku) coûte environ 0,01 $ par abonné et par mois, et le stockage tient dans les volumes inclus jusqu'à quelques milliers d'utilisateurs.
  - **Net par abonné** (TVA 20 %, Stripe 0,25 € + 1,5 %) : mensuel à 2,50 €, environ 1,79 € ; annuel à 20 €, environ 1,34 € par mois.
  - **Équilibre : environ 25 à 35 abonnés premium**, soit environ 250 à 350 utilisateurs actifs avec 10 % de premium. Environ 20 à 27 en franchise de TVA. À 3 € par mois ou 25 € par an, environ 20 abonnés.
  - Ne sont pas comptés : les impôts et les cotisations (selon le statut, voir avec un comptable).
  - Les deux abonnements Pro ne sont à prendre qu'à l'ouverture au public.
- **Stockage des photos** (décidé le 26/10) :
  - Supabase Storage d'abord : l'offre Pro est nécessaire de toute façon, et la sécurité par voyage est déjà en place.
  - Bascule vers Cloudflare R2 (sortie de données gratuite) au-delà d'environ 2 000 à 5 000 utilisateurs actifs, quand le trafic coûte plus de 30 $ par mois. Estimation : 10 000 utilisateurs actifs, environ 70 à 90 $ par mois avec Supabase seul contre environ 50 $ avec R2 ; 50 000, environ 400 à 500 $ contre environ 200 $.
  - À prévoir dès le départ : une colonne indiquant où est rangé chaque fichier, et un seul module pour l'accès au stockage.

### 4. Photos et souvenirs — fait le 28/10 (photos, vidéos, couvertures, « Revivre ») ; quotas et premium codés le 02/11 (branche `feat/partage`), partage public et réactions aussi
- **Décisions de Karl (28/10)** :
  - **Qui ajoute** : le propriétaire et les participants (les lecteurs regardent seulement).
  - **Qui supprime** : l'auteur de la photo, et le propriétaire du voyage.
  - **Vidéos acceptées dès maintenant**, compressées sur le téléphone (720p, environ 16 Mo par minute), avec une limite de **30 Mo par vidéo après compression** (environ 2 minutes). Si le téléphone ne sait pas compresser, l'original est accepté seulement s'il fait moins de 30 Mo.
  - **Lieu (GPS) retiré** des photos à l'envoi : la compression l'efface, rien n'est gardé, donc aucun consentement n'est nécessaire.
  - Si on garde un jour la position, ce sera avec un consentement explicite (un réglage désactivé par défaut) et une mention dans la politique de confidentialité.
- **Plan** : A. photos et vidéos d'un voyage (ajout, grille par jour, visionneuse, couverture) ; B. souvenirs (stories, « il y a 1 an », diaporama « Revivre ») ; C. quotas, avec le premium.
- Import des photos depuis le téléphone, compression avant envoi, stockage par voyage.
- Remplace le compteur `photos: 0` et les couvertures en dégradé.
- Points à anticiper : les quotas de stockage et leur coût.

### 5. Budget partagé
- Dépenses par voyage, qui a payé quoi, répartition et soldes entre participants.

### 6. Notifications — première notification (e-mail analysé) faite le 26/10 ; rappels de vol à venir
- Web Push : sur iPhone, ça ne marche qu'avec l'app installée sur l'écran d'accueil (iOS 16.4 et plus).
- Rappel d'enregistrement 24 h avant un vol, ajout d'une réservation par un autre participant.

### 7. Ouverture au public
- **Photos et vidéos** dans les documents légaux :
  - **politique de confidentialité** : ce qui est stocké (copies compressées, sans lieu), où (Supabase, Europe), qui les voit (les membres du voyage), durée de conservation, suppression avec le voyage ou le compte ;
  - **CGU**, et non CGV : l'utilisateur garantit avoir les droits sur ce qu'il publie, et l'accord des personnes photographiées ; il accorde une licence d'hébergement limitée au service.
  - À faire relire par un juriste.
- Revoir les textes des notifications (ton choisi provisoirement le 26/10). Idée : un emoji selon le type de réservation (🏨 hôtel, 🚆 train, 🎟️ activité, 🍽️ restaurant…) au lieu du ✈️ fixe. Toutes les réservations sont déjà notifiées, quel que soit leur type.
- CGU et politique de confidentialité, avec la liste des sous-traitants : Supabase, Vercel, Open-Meteo, SMTP, IA.
- Gestion des quotas et des coûts, nom de domaine, page d'accueil.

### 8. Nouvelle direction artistique : maquettes Figma « Wayfarer » (ajoutées par Karl le 02/11)
- **Où** : dossier [figma_mockups/Carte interactive de voyages](figma_mockups/Carte%20interactive%20de%20voyages), un export Figma Make (React et Tailwind). On s'en sert comme référence, sans le copier tel quel.
  - [src/App.tsx](figma_mockups/Carte%20interactive%20de%20voyages/src/App.tsx) : une page d'accueil publique et la maquette de l'accueil mobile.
  - [src/index.css](figma_mockups/Carte%20interactive%20de%20voyages/src/index.css) : les styles.
  - [public/wayfarer-palette.css](figma_mockups/Carte%20interactive%20de%20voyages/public/wayfarer-palette.css) : la palette.
- **Typographie** :
  - **Titres** : DM Serif Display (400, avec l'italique pour les mots mis en valeur, en corail). Elle remplace Bricolage Grotesque.
    - à embarquer avec `@fontsource/dm-serif-display`, pour l'usage hors ligne, comme les polices actuelles ;
    - à changer dans `--font-display` (`src/styles.css`).
  - **Texte** : DM Sans, déjà en place. On ajoute la graisse 700 pour les petites étiquettes en capitales espacées.
- **Palette Wayfarer**, à reporter dans `src/theme/palettes.ts`, le seul fichier des couleurs :

  | Nom | Valeur | Usage proposé (clair) |
  |---|---|---|
  | Forest | `#183F37` | `textPrimary`, boutons sombres, contours du globe |
  | Deep Forest | `#0F302A` | titres ; fond du thème sombre |
  | Warm Cream | `#F7F3E9` | `bgBase` |
  | Paper | `#FFFCF4` | `bgSurface` (cartes) |
  | Travel Coral | `#F26B4B` | `accentSunset` (boutons, pays visités) |
  | Golden Hour | `#E9AD3A` | `accentSun` (repères, étiquettes) |
  | Soft Sage | `#DFE5CF` | `bgElevated`, terres du globe |

  - **Bordures** : `rgba(24, 63, 55, 0.16)`. **Texte secondaire** : `#597069` ou `#70817B`.
  - **Le dégradé « sunset »** (`gradients` dans `palettes.ts`) passe du corail au doré : `#F26B4B` → `#E9AD3A`.
  - **Contraste à corriger** : le corail sur fond crème n'atteint pas le minimum lisible pour du petit texte. On garde `#F26B4B` pour les aplats et les boutons, et on prend un corail plus foncé pour le texte, vers `#C4472B`, à valider.
  - **Thème sombre** : absent des maquettes. Proposition, à valider avec Karl :
    - fond Deep Forest `#0F302A`, cartes Forest `#183F37`, éléments posés `#22493F` ou `#366158` ;
    - texte crème `#F7F3E9`, texte secondaire `#ABC0BA` (celui du bandeau des fonctionnalités) ;
    - mêmes accents corail et doré ;
    - étoiles de l'écran Monde retirées ou très atténuées.
- **Éléments à reprendre des maquettes** :
  - **En-tête de l'accueil** : petit sur-titre corail (« BONJOUR, KARL ») et titre à empattements sur deux lignes. Les textes doivent rester neutres : pas de « Où êtes-vous allée ? », plutôt « Votre monde, en un regard ».
  - **Globe « papier »** :
    - océan crème dégradé (`#FFFDF5` → `#E5E5D2`), terres sauge (`#CAD3AD`, contour `#718872`) ;
    - pays visités en corail, contour Forest ;
    - orbites fines décoratives ;
    - repères ronds bordés de blanc, avec une animation « ping » sur le repère actif ;
    - carte du lieu en verre dépoli en bas.
  - **Chiffres** : 3 colonnes séparées par des filets, nombres en DM Serif, libellés en petites capitales espacées.
  - **Carte souvenir** : photo pleine largeur assombrie vers le bas, dates en doré, ville en serif, « 18 souvenirs · 9 jours », cœur en haut à droite. À utiliser pour Souvenirs et pour « Les souvenirs de la communauté ».
  - **Barre d'onglets en verre** : flottante, arrondie, flou et reflet, petit point corail sur l'onglet actif, bouton « + » central corail légèrement incliné.
    - **À décider** : la maquette a 4 onglets et le « + », l'app en a 5 (avec Explorer). Faut-il regrouper Souvenirs et Explorer, ou garder 5 onglets sans « + » central ?
  - **Boutons** : en pilule (999 px), corail pour l'action principale, Forest pour les autres. Ils montent légèrement au survol, et rien ne bouge au toucher.
- **À ne pas reprendre** :
  - **Le nom** : « Wayfarer » est celui de la maquette ; l'app s'appelle **Tripmates** (décidé le 02/11), sur https://tripmates.app.
  - **Le contenu factice** : les faux chiffres (« 12 000+ voyageurs », 24 pays…), la photo Unsplash, les initiales « ML ».
  - **La section « palette »** de la page d'accueil : c'est un outil de travail, pas du contenu.
- **Page d'accueil publique** (hors de l'app, pour `tripmates.app` à l'ouverture) :
  - à reprendre de la maquette : héros « Chaque voyage laisse une trace », bandeau des fonctionnalités, présentation mobile, citation, pied de page ;
  - avec de vrais chiffres ou sans chiffres, et un bouton « Ouvrir l'app ».
  - À faire avec l'étape 7 (ouverture au public).
- **Avancement (02/11)** : étapes 1 à 3 faites sur `feat/design-wayfarer` (barre d'onglets gardée à 5 onglets), étape 4 en partie (couleurs et polices partout, sans refonte des blocs).
- **Ordre conseillé** :
  1. **Couleurs et polices** dans `palettes.ts` et `styles.css` : toute l'app change d'un coup. Vérifier le contraste dans les deux thèmes.
  2. **Écran Monde** : en-tête, globe papier, chiffres, prochain départ, communauté en cartes souvenir.
  3. **Barre d'onglets en verre**, une fois tranchée la question des onglets.
  4. **Les autres écrans un par un** (Voyages, Voyage, Billet, Souvenirs, Explorer, Profil), avec une capture avant et après sur iPhone.
  5. **Page d'accueil publique.**
- **Garder dans Git** le dossier `figma_mockups`, avec son sous-dossier `.figma`, que Figma Make demande de commiter. Il n'est pas compilé avec l'app : Vite ne lit que `src/`.

### 9. Héberger l'app sur un VPS avec Dokploy (au lieu de Vercel Pro)
- **Code fait le 02/11** (branche `feat/design-wayfarer`) : `Dockerfile` (Node 22 puis nginx), `deploy/nginx.conf` et `deploy/securite.conf`, `.dockerignore`. Vercel Analytics et Speed Insights retirés, remplacés par Umami en option (`src/lib/analytics.ts`, variables `VITE_UMAMI_SRC` et `VITE_UMAMI_WEBSITE_ID`). Adresse de repli de `billing` : `https://tripmates.app`. Pages légales : hébergeur du VPS à compléter.
  - **Testé en local avec Docker** : toutes les adresses (accueil, pages légales, app, redirections des `.html`, 404, `/sante`), cache, compression, en-têtes de sécurité, service worker actif dans Chrome.
  - **Marche à suivre complète** : [docs/hebergement.md](docs/hebergement.md). Le plan ci-dessous reste comme historique.
- **Pourquoi** :
  - Vercel Hobby interdit l'usage commercial, et Vercel Pro coûte 20 $ par mois.
  - L'app est un site statique (une PWA compilée par Vite, sans serveur) : un petit VPS suffit, pour environ 4 à 6 € par mois.
  - Point d'équilibre : les frais fixes passent d'environ 43 € à 28 à 30 € par mois, soit environ 17 à 20 abonnés au lieu de 25 à 35.
  - Rien ne change pour Supabase (base, fonctions, stockage) ni pour Cloudflare (relais e-mail).
- **Serveur** :
  - Hetzner CX22 (2 vCPU, 4 Go, Allemagne ou Finlande, environ 4,50 € par mois), ou équivalent chez OVH ou Scaleway, en Europe pour le RGPD ;
  - Ubuntu 24.04, accès SSH par clé, pare-feu limité à 22, 80 et 443.
- **Dokploy** : installation en une commande (voir docs.dokploy.com). Il gère :
  - Traefik et les certificats HTTPS (Let's Encrypt) ;
  - le déploiement automatique à chaque push sur `main`, depuis GitHub ;
  - les variables d'environnement ;
  - le retour à une version précédente.
- **Ce qu'il faut ajouter au projet** (travail de code, pour Claude) :
  - **Un `Dockerfile` en deux étapes** :
    - Node 22 : `npm ci` puis `npm run build`, avec les variables `VITE_*` passées à la compilation ;
    - puis nginx (ou Caddy), qui sert `dist/`.
  - **Une configuration nginx** :
    - renvoyer `index.html` pour toutes les pages de l'app, ce que fait aujourd'hui `vercel.json` ;
    - `Cache-Control: no-cache` sur `index.html`, `sw.js` et `manifest.webmanifest`, pour que l'app installée se mette à jour ;
    - un cache d'un an sur `assets/*` ;
    - la compression, les en-têtes de sécurité et le bon type pour `.webmanifest`.
  - **Remplacer Vercel Analytics et Speed Insights**, qui ne marchent que sur Vercel : soit Umami installé sur le même Dokploy, soit rien. À mettre à jour dans la politique de confidentialité.
  - **Supprimer `vercel.json`** une fois la bascule faite.
- **Bascule** (à faire en même temps que le passage sur `tripmates.app`, pour ne changer d'adresse qu'une fois) :
  1. **DNS chez Cloudflare** : `app.tripmates.app` (ou la racine), en enregistrement A vers le VPS, sans proxy au début, pour que Let's Encrypt fonctionne.
  2. **Supabase → Authentication → URL Configuration** : Site URL et Redirect URLs avec la nouvelle adresse.
  3. **Secret `APP_URL`** à la nouvelle adresse : retours de Stripe, portail client.
  4. **Vérifier** sur la nouvelle adresse : connexion par code, invitations, notifications (nouvelle autorisation), hors ligne, mise à jour de l'app installée.
  5. **Prévenir les utilisateurs** : l'app installée est liée à son adresse. Il faudra la réinstaller depuis la nouvelle adresse et se reconnecter une fois. Les données restent, elles sont dans Supabase.
  6. **Garder Vercel** une ou deux semaines, avec une redirection vers la nouvelle adresse, puis le fermer.
- **Suivi** :
  - Uptime Kuma, sur le même Dokploy, avec une alerte par e-mail ;
  - mises à jour de sécurité automatiques d'Ubuntu (`unattended-upgrades`).

### 10. Passer Stripe en réel (fin du mode test)
- **Avant tout** (Karl) :
  - **Statut** : micro-entreprise avec un SIRET, ou autre statut avec l'aide du comptable, et un compte bancaire professionnel.
  - **TVA** :
    - en franchise : mention « TVA non applicable, art. 293 B du CGI » sur les reçus ;
    - sinon, TVA française, et Stripe Tax au-delà de 10 000 € de ventes à des particuliers d'autres pays de l'UE.
  - **Activer le compte Stripe** (Switch to live account) : identité, entreprise, compte bancaire, nom affiché sur les relevés (par exemple « TRIPMATES »).
- **Documents légaux**, en ligne avant le premier paiement réel : CGV, CGU, mentions légales et politique de confidentialité (photos, IA, paiement, sous-traitants), à faire relire.
  - **Droit de rétractation** : pour un service numérique qui démarre tout de suite, l'acheteur doit accepter expressément de renoncer à son délai de 14 jours.
- **Dans le code** (Claude) :
  - **Checkout** :
    - case obligatoire d'acceptation des CGV (`consent_collection[terms_of_service]=required`, avec l'adresse des CGV dans les réglages Stripe) ;
    - texte sur la renonciation au délai de rétractation (`custom_text`).
  - **Prix affichés** (`PRICES` dans `src/lib/plan.ts`) : à vérifier contre les prix réels.
  - **Message d'erreur détaillé** : il ne s'affiche qu'en mode test, il disparaît tout seul avec une clé `sk_live_`.
- **Dans Stripe, en mode réel** (les objets de test ne sont pas recopiés) :
  1. Recréer le produit Premium et ses deux prix, puis noter les nouveaux `price_…`.
  2. Régler le portail client : résiliation à la fin de la période, carte, factures.
  3. Créer un nouveau webhook vers la même adresse `stripe-webhook`, avec les 4 événements, et noter le nouveau `whsec_…`.
  4. Personnaliser : logo, couleurs Wayfarer, reçus envoyés par e-mail, adresse de support.
- **Bascule** :
  - remplacer les secrets Supabase (`STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTH`, `STRIPE_PRICE_YEAR`) ;
  - pas besoin de redéployer.
- **Abonnements de test** : la colonne `stripe_customer_id` pointe vers des clients de test. Les effacer avant la bascule : `delete from subscriptions where status <> 'offert';`.
- **Vérification** :
  - un vrai paiement mensuel avec ta propre carte, puis le remboursement et la résiliation dans Stripe ;
  - contrôler que le profil repasse en « Gratuit » à l'échéance.

### Plus tard
- Bilan annuel des voyages (« Wrapped »).
- Souvenirs automatiques (« il y a un an »).
