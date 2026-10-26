import { installPlatform, isInstalled } from './install'
import { supabase } from './supabase'

/**
 * Notifications sur le téléphone (Web Push).
 *
 * Sur iPhone, elles ne fonctionnent que dans l'app installée sur l'écran d'accueil (iOS 16.4 et plus),
 * et l'autorisation ne peut être demandée qu'après un geste de l'utilisateur (un bouton).
 * L'abonnement de l'appareil est enregistré dans Supabase (table push_subscriptions) ; les fonctions
 * serveur s'en servent pour prévenir, par exemple, qu'un e-mail transféré a été analysé.
 */

const PUBLIC_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY || undefined
/** Les notifications sont-elles configurées (clé publique dans .env) ? */
export const PUSH_CONFIGURED = Boolean(PUBLIC_KEY)

export type PushState =
  /** Notifications pas encore configurées côté app (clé publique absente) */
  | 'non-configure'
  /** iPhone : il faut d'abord installer l'app sur l'écran d'accueil */
  | 'installer-d-abord'
  /** Navigateur sans notifications */
  | 'non-pris-en-charge'
  /** L'utilisateur les a refusées (à réactiver dans les réglages du téléphone) */
  | 'refuse'
  | 'inactif'
  | 'actif'

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** Service worker prêt, sans attendre indéfiniment (il n'existe pas en développement) */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 3000))])
}

export async function pushState(): Promise<PushState> {
  if (!PUBLIC_KEY) return 'non-configure'
  if (installPlatform().startsWith('ios') && !isInstalled()) return 'installer-d-abord'
  if (!supported()) return 'non-pris-en-charge'
  if (Notification.permission === 'denied') return 'refuse'
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'actif' : 'inactif'
}

/** Clé publique VAPID (base64url) → octets, comme l'attend pushManager.subscribe */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** À appeler depuis un bouton : demande l'autorisation, abonne l'appareil et l'enregistre */
export async function enablePush(): Promise<PushState> {
  if (!PUBLIC_KEY || !supported()) return pushState()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'inactif'
  const reg = await registration()
  if (!reg) throw new Error("L'app n'est pas encore prête : rouvrez-la puis réessayez.")
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }))
  const keys = sub.toJSON().keys ?? {}
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: keys.p256dh ?? '',
    p_auth: keys.auth ?? '',
    p_user_agent: deviceLabel(),
  })
  if (error) throw error
  return 'actif'
}

/** Coupe les notifications sur cet appareil (et à la déconnexion : le compte ne doit plus y arriver) */
export async function disablePush(): Promise<void> {
  if (!supported()) return
  const sub = await (await registration())?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe().catch(() => false)
}

function deviceLabel(): string {
  const p = installPlatform()
  return p.startsWith('ios') ? 'iPhone' : p === 'android' ? 'Android' : 'Ordinateur'
}
