/**
 * Clés VAPID des notifications (Web Push). À lancer une seule fois, voir docs/notifications.md.
 *
 *   npx -y deno@2.9.6 run --node-modules-dir=none scripts/cles-notifications.ts
 *       → affiche la paire de clés (base64), à mettre dans le secret Supabase VAPID_KEYS
 *   npx -y deno@2.9.6 run --node-modules-dir=none --allow-env scripts/cles-notifications.ts publique
 *       → lit $VAPID_KEYS et affiche la clé publique, à mettre dans .env (VITE_VAPID_PUBLIC_KEY)
 *
 * La paire est encodée en base64 (sans guillemets) pour passer sans souci dans PowerShell.
 */
import * as webpush from 'jsr:@negrel/webpush@0.5.0'

if (Deno.args[0] === 'publique') {
  const raw = Deno.env.get('VAPID_KEYS')
  if (!raw) throw new Error('Variable VAPID_KEYS absente')
  const keys = await webpush.importVapidKeys(JSON.parse(atob(raw)), { extractable: true })
  console.log(await webpush.exportApplicationServerKey(keys))
} else {
  const keys = await webpush.generateVapidKeys({ extractable: true })
  console.log(btoa(JSON.stringify(await webpush.exportVapidKeys(keys))))
}
