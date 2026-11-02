# Partage public des photos et premium

## Partage public

- Une photo ou une vidéo est **privée** par défaut : seuls les membres du voyage la voient.
- Son **auteur** peut la rendre publique depuis la visionneuse (« Rendre publique »), en choisissant une ville du voyage et, s'il le veut, une légende publique. Il coche qu'il a pris la photo et que les personnes reconnaissables sont d'accord.
- Une photo publique est visible de **tous les utilisateurs connectés** (jamais sans compte), avec :
  - la ville, et la position de la ville, jamais celle de la photo ;
  - le **mois** de prise de vue, pour ne pas révéler où se trouve quelqu'un en ce moment ;
  - le prénom et l'avatar de l'auteur.
- Rien du voyage n'est montré aux autres : ni le titre, ni les dates, ni les voyageurs.
- **Retirer** du public : l'auteur, ou le propriétaire du voyage. Les réactions sont effacées.
- Supprimer la photo, le voyage ou le compte retire aussi la photo du public.
- **Réactions** : une par personne et par photo, au choix « J'aime », « J'adore », « Waouh » ou « Wishlist ». Les photos en Wishlist se retrouvent dans l'onglet « Wishlist » d'Explorer.
- **Base** : migration `20261102100000_partage.sql`, avec les tables `photo_shares`, `photo_reactions`, `photo_reports` et `user_blocks`, et les fonctions `publish_photo`, `public_photos` et `public_places`.

## Modération

- **Signaler** (dans Explorer) : une fois par personne, avec un motif (contenu choquant, personne reconnaissable sans accord, pas sa photo, spam, autre).
- **À 3 signalements**, la photo est masquée automatiquement (`photo_shares.hidden_at`). L'auteur et les membres du voyage la voient toujours, avec la mention « Masquée après des signalements ».
- **Bloquer** quelqu'un : on ne voit plus ses photos, et il ne voit plus les nôtres.
- **Limite** : 30 nouvelles publications par jour et par personne.

### Traiter les signalements (Karl, dans le tableau de bord Supabase → SQL Editor)

Photos signalées, les plus signalées d'abord :

```sql
select s.photo_id, s.city, s.hidden_at, a.display_name as auteur, count(r.*) as signalements,
       array_agg(r.reason) as motifs, p.path
from photo_shares s
join profiles a on a.id = s.author_id
join trip_photos p on p.id = s.photo_id
join photo_reports r on r.photo_id = s.photo_id
group by s.photo_id, a.display_name, p.path
order by count(r.*) desc;
```

Pour voir l'image : Storage → `trip-photos`, au chemin indiqué par `path`.

- **La photo est correcte** : on la remet en ligne et on efface ses signalements.
  ```sql
  update photo_shares set hidden_at = null, hidden_reason = null where photo_id = '…';
  delete from photo_reports where photo_id = '…';
  ```
- **La photo enfreint les règles** : on la retire du public ; elle reste dans le voyage de son auteur.
  ```sql
  delete from photo_shares where photo_id = '…';
  ```
- **Masquer tout de suite**, sans attendre 3 signalements :
  ```sql
  update photo_shares set hidden_at = now(), hidden_reason = 'moderation' where photo_id = '…';
  ```

Le règlement européen sur les services numériques (DSA) demande, pour un hébergeur de contenus publics :
- un moyen de signaler, ce qui est fait ;
- un point de contact ;
- une réponse motivée à l'auteur d'une photo retirée ;
- des CGU claires.

À prévoir avec l'ouverture au public : voir l'étape 7 de [SUIVI.md](../SUIVI.md).

## Premium et quotas

- **Gratuit** :
  - 5 lectures par l'IA au total ;
  - photos dans 2 voyages au plus, 250 Mo.
- **Premium** :
  - 300 lectures par l'IA sur 30 jours ;
  - photos dans tous les voyages, 20 Go.
- **Le propriétaire paie pour tous** :
  - les photos de tous les membres comptent dans l'espace du propriétaire du voyage ;
  - s'il est premium, ses voyageurs ont la lecture par l'IA dans ce voyage ;
  - les e-mails transférés comptent sur le compte de celui qui transfère.
- **Contrôles côté serveur** :
  - à l'envoi d'une photo, la base compte le poids réel des fichiers stockés, pas celui annoncé par l'app ;
  - les fonctions `extract-booking` et `inbound-email` appellent `ai_allowance`, en plus du garde-fou de 40 lectures sur 24 h.
- **Après la fin d'un abonnement** :
  - les photos restent ;
  - les voyages au-delà de 2 et l'espace au-delà de 250 Mo ne reçoivent plus de nouvelles photos.
- **Paiement en retard** : le premium est gardé jusqu'à 3 jours après l'échéance, le temps que Stripe relance.
- **Base** : migration `20261102110000_premium.sql`, avec la table `subscriptions` et les fonctions `my_plan`, `photo_quota_check` et `ai_allowance`.

### Offrir le premium (Karl, Louna, testeurs)

```sql
insert into subscriptions (user_id, status)
select id, 'offert' from auth.users where email = 'karl.d@snt2.fr'
on conflict (user_id) do update set status = 'offert';
```

Un premium offert n'est jamais remplacé par Stripe. Pour le retirer : `delete from subscriptions where user_id = '…'`.

### Mettre en place Stripe (Karl)

1. Sur dashboard.stripe.com, **en mode test** d'abord :
   - créez un produit « Premium » avec deux prix récurrents, 2,50 € par mois et 20 € par an ;
   - notez leurs identifiants `price_…`.
   - Si vous changez les montants, mettez à jour `PRICES` dans `src/lib/plan.ts`.
2. **Portail client** (Settings → Billing → Customer portal) : activez la résiliation et le changement de carte.
3. **Webhook** (Developers → Webhooks) :
   - adresse `https://<projet>.supabase.co/functions/v1/stripe-webhook` ;
   - événements : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` ;
   - notez le secret `whsec_…`.
4. **Secrets Supabase** :
   ```
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… STRIPE_PRICE_MONTH=price_… STRIPE_PRICE_YEAR=price_… APP_URL=https://voyages-app-chi.vercel.app
   ```
   Plus tard, avec Stripe Tax activé, ajoutez aussi `STRIPE_AUTOMATIC_TAX=true`.
5. **Déploiement** : `npx supabase functions deploy billing`, puis `npx supabase functions deploy stripe-webhook`.
6. **Essai** avec la carte de test `4242 4242 4242 4242` :
   - l'offre du profil passe à « Premium » en quelques secondes ;
   - « Gérer l'abonnement » ouvre le portail.
7. **Passage en mode réel** à l'ouverture au public, avec les CGV et la TVA (voir l'étape 7 de [SUIVI.md](../SUIVI.md)).
