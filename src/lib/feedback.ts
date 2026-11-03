import { preparePhoto } from './media'
import { supabase } from './supabase'

export type FeedbackKind = 'bug' | 'idee'

/** Appareil et mode d'ouverture, pour comprendre un bug sans poser de questions */
function deviceInfo(): string {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  return `${navigator.userAgent} · ${standalone ? 'app installée' : 'navigateur'} · écran ${screen.width}×${screen.height}`
}

/**
 * Envoie un retour (fonction feedback) : la capture facultative est d'abord compressée en JPEG
 * et rangée dans le dossier de l'utilisateur (bucket « feedback »).
 */
export async function sendFeedback(kind: FeedbackKind, message: string, page: string, screenshot?: File): Promise<void> {
  let screenshotPath: string | undefined
  if (screenshot) {
    const { data: auth } = await supabase.auth.getUser()
    const prepared = await preparePhoto(screenshot)
    const path = `${auth.user?.id}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('feedback').upload(path, prepared.full, { contentType: 'image/jpeg' })
    if (error) throw error
    screenshotPath = path
  }
  const { error } = await supabase.functions.invoke('feedback', { body: { kind, message, page, device: deviceInfo(), screenshotPath } })
  if (error) {
    const context = (error as { context?: Response }).context
    const res = context ? await context.json().catch(() => null) : null
    throw new Error(res?.error ?? 'L’envoi a échoué. Réessayez dans un moment.')
  }
}
