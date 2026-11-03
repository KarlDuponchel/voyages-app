# Notifications sur le téléphone

Quand un e-mail transféré à l'adresse d'import a été analysé, le téléphone reçoit une notification, par exemple :
« Nouvelle réservation à valider · Yotel New York. Touchez pour vérifier et ajouter. »
Un appui ouvre directement **E-mails à valider**. Si rien n'a été trouvé, la notification le dit aussi.

- **iPhone** : uniquement dans l'app **installée sur l'écran d'accueil** (iOS 16.4 et plus). C'est une règle d'Apple.
- **Android** : dans Chrome, installée ou non.
- **Activation** : dans **Profil → Notifications**, ou depuis l'écran « E-mails à valider ». Le téléphone demande l'autorisation.
- **Déconnexion** : le téléphone cesse de recevoir les notifications du compte.

## Comment ça marche

```
App (bouton « Activer ») ──▶ pushManager.subscribe (clé publique VAPID)
                         ──▶ save_push_subscription → table push_subscriptions
inbound-email (e-mail analysé) ──▶ _shared/push.ts : message chiffré + signé VAPID
                               ──▶ service de notification (Apple / Google) ──▶ téléphone
Service worker (public/push-sw.js) ──▶ affiche la notification ; un appui ouvre /imports
```

| Élément | Rôle |
|---|---|
| `supabase/migrations/20261027100000_notifications.sql` | Table `push_subscriptions` (chacun ne voit que ses appareils) et fonction `save_push_subscription` |
| `supabase/functions/_shared/push.ts` | Envoi chiffré (bibliothèque `@negrel/webpush`), suppression des abonnements expirés, texte des notifications |
| `public/push-sw.js` | Réception de la notification et ouverture de la bonne page (chargé par le service worker, `vite.config.ts`) |
| `src/lib/push.ts`, `src/components/NotificationsSwitch.tsx` | Activer et couper les notifications dans l'app |
| `scripts/cles-notifications.ts` | Génération des clés VAPID |

Les **clés VAPID** identifient l'app auprès des services de notification :
- la **clé publique** est dans l'app (`VITE_VAPID_PUBLIC_KEY` dans `.env`) ;
- la **paire complète** est uniquement dans le secret Supabase `VAPID_KEYS`.

Tant que la clé publique n'est pas dans `.env`, les notifications sont cachées dans l'app.

## Mise en route (une seule fois)

Depuis le dossier du projet, dans **PowerShell** :

**1. Générer les clés et enregistrer la paire dans Supabase.** Elle ne s'affiche pas : elle passe par une variable de la fenêtre.
```powershell
$env:VAPID_KEYS = npx -y deno@2.9.6 run --node-modules-dir=none scripts/cles-notifications.ts
```
```powershell
npx supabase secrets set "VAPID_KEYS=$env:VAPID_KEYS"
```

**2. Afficher la clé publique**, dans la même fenêtre.
```powershell
npx -y deno@2.9.6 run --node-modules-dir=none --allow-env scripts/cles-notifications.ts publique
```
Copie la ligne affichée dans `.env`, sur la ligne `VITE_VAPID_PUBLIC_KEY=`, ou donne-la à Claude. Elle est publique : aucun risque.

**3. Appliquer la migration et déployer la fonction.**
```bash
npx supabase db push
```
```bash
npx supabase functions deploy inbound-email
```

**4. Mettre l'app en ligne** (`main`), puis, dans l'app **installée** : **Profil → Notifications → Activer**.

Ne régénère pas les clés sans raison : les téléphones déjà abonnés ne recevraient plus rien, et il faudrait réactiver les notifications sur chacun.

## Tests

```bash
npm run test:functions
```
Ces tests vérifient le texte des notifications, ainsi que l'envoi chiffré et signé vers un faux service de notification.

```bash
npm run test:db
```
Ces tests vérifient la sécurité de `push_subscriptions` : chacun ne voit que ses appareils, on ne peut pas inscrire un appareil au nom d'un autre, et un appareil qui change de compte passe au nouveau.

## Rappel la veille d'un vol

Environ 24 h avant un vol, chaque voyageur du voyage reçoit :
« ✈️ Demain : Paris → Lisbonne · Départ à 07:15 · TAP Air Portugal TP 433. Pensez à l'enregistrement en ligne… ».
Un appui ouvre le billet.

- **Quels vols** : les réservations « vol » qui partent dans 22 à 26 h, à l'heure du lieu de départ (fuseau de la réservation, sinon de la première étape, sinon Paris). Fonction de base `due_flight_reminders()`, réservée au serveur.
- **Une seule fois** : `bookings.reminded_at` est rempli à l'envoi. Si l'heure du vol change, il est remis à zéro et le rappel repart.
- **Quand** : toutes les heures (à la 5ᵉ minute), `pg_cron` appelle la fonction `flight-reminders` avec `pg_net`.
- **Sécurité** : la fonction n'accepte que l'en-tête `x-cron-secret` égal au secret `CRON_SECRET`. Le même secret est rangé dans le coffre de Supabase (Vault) sous le nom `cron_secret`, où la tâche planifiée le lit. Rien de secret n'est dans le dépôt.
- **Fichiers** : migration `20261103160000_rappels_vol.sql`, `supabase/functions/flight-reminders`, texte dans `_shared/push.ts` (`flightReminder`).

**Mise en route (une fois)**, dans PowerShell, sans afficher le secret :
```powershell
$env:CRON_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```
```powershell
npx supabase secrets set "CRON_SECRET=$env:CRON_SECRET"
```
```powershell
npx supabase db query --remote "select vault.create_secret('$env:CRON_SECRET', 'cron_secret')"
```
Puis `npx supabase db push --remote` et `npx supabase functions deploy flight-reminders`.

**Vérifier** : Supabase → Integrations → Cron → `rappels-vol` (historique des appels), et les journaux de la fonction `flight-reminders` (`{ flights, sent }`).
