/**
 * Installation de l'app sur l'écran d'accueil (PWA).
 *
 * L'installation se fait depuis le navigateur, avec des gestes différents selon l'appareil : il faut
 * donc reconnaître l'appareil pour afficher les bonnes étapes. C'est le seul endroit de l'app où on
 * lit le « user agent » : aucune autre API ne dit si on est sur Safari iPhone ou sur Chrome Android.
 */

export type InstallPlatform = 'ios-safari' | 'ios-autre' | 'android' | 'ordinateur'

/** L'app tourne-t-elle déjà depuis l'écran d'accueil (plein écran) ? */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function installPlatform(): InstallPlatform {
  const ua = navigator.userAgent
  // iPadOS se présente comme un Mac : on le reconnaît à son écran tactile
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? 'ios-autre' : 'ios-safari'
  if (/Android/.test(ua)) return 'android'
  return 'ordinateur'
}

// ---- Proposition d'installation du navigateur (Chrome, Edge, Samsung Internet sur Android) ----------

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

/** À appeler au démarrage : le navigateur n'envoie l'événement qu'une fois, souvent avant l'affichage */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // on garde la proposition pour notre propre bouton
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export const canPromptInstall = () => deferred !== null

export function onInstallPromptChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Ouvre la fenêtre d'installation du navigateur ; renvoie true si l'utilisateur a accepté */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const event = deferred
  deferred = null
  await event.prompt()
  const { outcome } = await event.userChoice
  listeners.forEach((l) => l())
  return outcome === 'accepted'
}

// ---- Une seule fois par appareil ----------------------------------------------------------------

const STORAGE_KEY = 'voyages:installation'
/** « Plus tard » : on repropose après ce délai */
const LATER_DAYS = 7

type Seen = { until: number } | { never: true }

function readSeen(): Seen | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Seen | null
  } catch {
    return null
  }
}

/** Faut-il proposer l'installation maintenant ? Jamais dans l'app installée, ni sur ordinateur. */
export function shouldOfferInstall(): boolean {
  if (isInstalled() || installPlatform() === 'ordinateur') return false
  const seen = readSeen()
  if (!seen) return true
  return 'until' in seen && Date.now() > seen.until
}

export function dismissInstall(forever: boolean): void {
  const value: Seen = forever ? { never: true } : { until: Date.now() + LATER_DAYS * 86_400_000 }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // stockage bloqué (navigation privée) : le message reviendra à la prochaine ouverture
  }
}
