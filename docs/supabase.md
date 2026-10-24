# Base de données Supabase

Le schéma complet est dans [`supabase/migrations/`](../supabase/migrations/). Les règles de sécurité sont testées par `npm run test:db`, qui fait tourner un Postgres embarqué et ne demande pas de compte Supabase.

## Le principe : multi-utilisateurs dès le départ

N'importe qui peut créer un compte. **Un voyage appartient à ses membres**, et personne d'autre ne peut le voir. Un couple, une bande d'amis ou une famille sont simplement des membres du même voyage, et chacun peut aussi avoir ses voyages à lui.

La sécurité est appliquée par **Postgres lui-même** (Row Level Security). Même une app modifiée ou une requête faite à la main ne peut pas lire le voyage de quelqu'un d'autre.

| Table | Contenu | Qui y a accès |
|---|---|---|
| `profiles` | Nom affiché, avatar, ville de départ (pour les distances) | Soi-même, plus les personnes avec qui on partage un voyage |
| `trips` | Titre, dates, budget et devise, couverture | Les membres du voyage |
| `trip_destinations` | Étapes : ville, pays, coordonnées (un voyage peut traverser plusieurs pays) | Les membres |
| `trip_members` | Qui participe, avec quel rôle | Les membres |
| `trip_invitations` | Liens d'invitation | Propriétaires et éditeurs |
| `bookings` | Réservations (vol, train, hôtel…) avec les données du billet | Les membres |
| `booking_files` | PDF et captures liés à une réservation (bucket privé `trip-files`) | Les membres |
| `user_countries` | Pays visités avant l'app, saisis à la main | Soi-même uniquement |
| `my_visited_countries` (vue) | Pays visités = saisie manuelle + étapes des voyages terminés | Soi-même |
| `import_addresses` | Adresse de transfert des e-mails (alias aléatoire) | Soi-même uniquement |
| `pending_imports` | E-mails transférés lus par l'IA, en attente de validation (pièces jointes dans le bucket privé `imports`) | Soi-même ; seules les fonctions serveur écrivent |
| `ai_usage` | Lectures par l'IA (limite quotidienne, tokens consommés) | Soi-même en lecture ; seules les fonctions serveur écrivent |

L'import par l'IA (fonctions `extract-booking` et `inbound-email`, relais e-mail Cloudflare) est décrit dans [import-ia.md](import-ia.md).

### Les rôles dans un voyage

- **owner** (propriétaire) : il peut tout faire, y compris gérer les membres et supprimer le voyage. Le créateur devient propriétaire automatiquement.
- **editor** (éditeur) : il ajoute et modifie les étapes, les réservations et les fichiers, et il peut inviter des éditeurs ou des lecteurs.
- **viewer** (lecteur) : il voit le voyage sans pouvoir le modifier. C'est utile pour la famille qui veut suivre le voyage.

### Les invitations

Un membre crée une invitation et partage le lien (`/invitation/<jeton>`) par Messages, WhatsApp, etc. La personne ouvre le lien, se connecte ou crée son compte, puis accepte l'invitation.

- Un lien ne sert **qu'une fois** et **expire après 14 jours**. Il peut être révoqué à tout moment.
- On peut réserver une invitation à une adresse e-mail précise.
- Rejoindre un voyage passe **uniquement** par la fonction `accept_invitation`. Personne ne peut s'ajouter à un voyage tout seul.

### Les règles automatiques

- Un profil est créé à l'inscription.
- Un voyage garde toujours au moins un propriétaire. Si le dernier propriétaire quitte le voyage ou supprime son compte, l'éditeur le plus ancien devient propriétaire.
- Un voyage qui n'a plus aucun membre est supprimé.
- Supprimer son compte efface son profil, ses pays et sa place dans les voyages. Les voyages partagés restent aux autres membres, ce qui va dans le sens du RGPD.
- On ne peut pas déplacer une réservation vers un autre voyage, ni changer l'auteur d'une ligne.

### Les dates et les fuseaux horaires

Les réservations sont enregistrées en **heure locale du lieu**, accompagnée de son fuseau (`Europe/Lisbon`). Un vol à 07:15 reste affiché à 07:15, quel que soit le fuseau du téléphone qui le consulte.

## Mise en place (à faire par Karl)

1. Sur [supabase.com](https://supabase.com), crée un projet dans une région **Europe**, de préférence *West EU (Paris)*.
2. Ouvre **SQL Editor**, colle le contenu de `supabase/migrations/20261021120000_schema_initial.sql`, puis clique sur **Run**.
3. Dans **Authentication → Sign In / Providers**, vérifie que **Email** est activé (c'est le cas par défaut).
4. Dans **Authentication → URL Configuration** :
   - mets `https://voyages-app-chi.vercel.app` comme **Site URL** ;
   - ajoute `https://voyages-app-chi.vercel.app/**` et `http://localhost:5173/**` dans les **Redirect URLs**.
5. Dans **Authentication → Emails → Templates**, ajoute le code dans les modèles **Magic Link** et **Confirm signup**, par exemple :
   `<p>Votre code : <strong>{{ .Token }}</strong></p>`
   Sans ce code, on ne peut pas se connecter depuis l'app installée sur l'iPhone. Elle ne partage pas sa session avec Safari, donc un lien ouvert depuis Mail connecterait Safari, pas l'app.
6. **Avant d'ouvrir l'app à d'autres personnes** : branche un service d'envoi d'e-mails (SMTP) dans **Authentication → Emails → SMTP Settings**. Resend, Brevo et d'autres ont une offre gratuite. Sans lui, Supabase n'envoie des e-mails qu'aux membres de l'équipe du projet, et seulement quelques-uns par heure.
7. Dans **Project Settings → API**, récupère l'**URL du projet** et la clé **anon / publishable**. Ces deux valeurs peuvent figurer dans l'app sans risque, car c'est la RLS qui protège les données. La clé **service_role** ou **secret**, elle, ne doit jamais aller dans l'app ni sur GitHub.

## Faire évoluer la base (Supabase CLI)

La première migration a été collée à la main dans SQL Editor. Pour les suivantes, la ligne de commande évite le copier-coller et garde l'historique des migrations appliquées. À faire une seule fois :

```bash
npx supabase login
npx supabase link --project-ref qpxcaywcslayfmcjcpgw
npx supabase migration repair --status applied 20261021120000
```

`link` demande le mot de passe de la base (Project Settings → Database). La commande `repair` indique que la première migration est déjà en place.

Ensuite, pour chaque évolution : créer un fichier dans `supabase/migrations/`, lancer `npm run test:db`, puis :

```bash
npx supabase db push
```

Et pour générer les types TypeScript de la base :

```powershell
npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/data/database.types.ts
```

Sous Windows PowerShell, `>` écrirait le fichier en UTF-16, que TypeScript lit mal. D'où `Out-File -Encoding utf8`.

Ces types sont branchés sur le client (`createClient<Database>`). Si la base et le code ne correspondent plus, la compilation le signale.

## Côté app

- **Configuration** : l'URL et la clé publique sont dans `.env`. Ce fichier est versionné, car ces valeurs sont publiques, et Vercel n'a donc rien à configurer.
- **Connexion** ([Connexion.tsx](../src/screens/Connexion.tsx), [auth.tsx](../src/data/auth.tsx)) : on saisit son e-mail, on reçoit un code et on le tape. Le compte est créé à la première connexion.
- **Données** ([store.tsx](../src/data/store.tsx)) : les voyages, les étapes, les réservations, les membres et les pays visités sont lus dans Supabase. Une copie reste sur le téléphone : l'app s'ouvre tout de suite et reste lisible hors ligne. Elle se met à jour au retour dans l'app et au retour du réseau. Les modifications demandent une connexion.
- **Création d'un voyage** : la destination se cherche avec le service gratuit Open-Meteo, qui fournit la ville, le pays, les coordonnées et le fuseau horaire. Seul le texte tapé lui est envoyé.
- **Partage** : dans un voyage, le bouton « Voyageurs » affiche les membres, crée un lien d'invitation (« peut modifier » ou « peut seulement voir ») et permet de quitter ou de supprimer le voyage.
- **Profil** : prénom (« Bonjour … »), ville de départ pour les distances, pays visités avant l'app, déconnexion et suppression du compte.

- **Modifications** : un voyage se modifie avec le crayon en haut de sa page (titre, dates, transport, budget). Les étapes s'ajoutent, se retirent et se réordonnent dans l'onglet Itinéraire. Une réservation se modifie ou se supprime depuis l'écran du billet. Tout cela est réservé aux propriétaires et aux participants : les lecteurs ne voient pas ces boutons, et la base refuse de toute façon.

- **Billets (PDF et captures)** ([files.ts](../src/lib/files.ts), [BookingFiles.tsx](../src/components/BookingFiles.tsx), [FileViewer.tsx](../src/components/FileViewer.tsx)) : un fichier se joint à l'ajout d'une réservation ou depuis l'écran du billet. Il est rangé dans le bucket privé `trip-files` sous `{trip_id}/{booking_id}/…` (20 Mo maximum, PDF ou image), avec une ligne dans `booking_files`. « Afficher le billet » l'ouvre en plein écran sur fond blanc, pour scanner le QR code. Les PDF sont dessinés par pdf.js, chargé seulement à l'ouverture.
  - **Hors ligne** : les fichiers des voyages à venir ou en cours sont copiés sur le téléphone (Cache Storage) à chaque mise à jour, et tout fichier ouvert une fois reste disponible. La copie est effacée à la déconnexion.
  - **Suppression** : supprimer une réservation ou un voyage retire aussi ses fichiers du stockage. Limite connue : si un voyage disparaît parce que son dernier membre supprime son compte, ses fichiers restent dans le stockage (la base ne peut pas les effacer elle-même). À nettoyer plus tard par une tâche planifiée.
