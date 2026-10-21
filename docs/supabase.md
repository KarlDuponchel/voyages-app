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
5. Dans **Project Settings → API**, récupère l'**URL du projet** et la clé **anon / publishable**. Ces deux valeurs peuvent figurer dans l'app sans risque, car c'est la RLS qui protège les données. La clé **service_role** ou **secret**, elle, ne doit jamais aller dans l'app ni sur GitHub.

## Côté app (étapes suivantes)

1. Ajouter `@supabase/supabase-js` et un fichier `.env.local` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, ces deux variables étant aussi à déclarer sur Vercel.
2. Créer l'écran de connexion par lien magique, puis l'écran d'accueil d'une invitation (`/invitation/:token`).
3. Remplacer `src/data/store.tsx` par des lectures et écritures Supabase, en gardant un cache local pour que l'app marche hors ligne.
4. Brancher le profil (« Bonjour {nom} », ville de départ pour les distances) et les pays visités (`my_visited_countries`) à la place des valeurs écrites en dur.
5. Ajouter l'envoi des PDF de billets dans le bucket `trip-files`, rangés sous `{trip_id}/{booking_id}/…`.
6. Proposer, à la première connexion, d'importer les voyages déjà enregistrés sur le téléphone.
