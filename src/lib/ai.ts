import type { BookingDraft } from '../data/types'
import { supabase } from './supabase'

/**
 * Lecture d'un billet (PDF ou capture) par l'IA, via la fonction Supabase extract-booking.
 * Rien n'est enregistré : on récupère des réservations proposées, que l'utilisateur vérifie.
 */

/** Fichier → base64 (sans le préfixe « data:…;base64, ») */
function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

/** L'IA sait lire les PDF et les images courantes (pas le HEIC, que Safari convertit d'habitude en JPEG) */
export const canReadWithAi = (file: File) => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)

export async function readTicket(tripId: string, file: File): Promise<BookingDraft[]> {
  if (!navigator.onLine) throw new Error('Pas de connexion : la lecture par l’IA demande internet.')
  const data = await toBase64(file)
  const { data: result, error } = await supabase.functions.invoke<{ drafts: BookingDraft[] }>('extract-booking', {
    body: { tripId, file: { name: file.name, mimeType: file.type, data } },
  })
  if (error) {
    // La fonction renvoie un message lisible dans { error } ; sinon, message générique
    const context = (error as { context?: Response }).context
    const body = context ? await context.json().catch(() => null) : null
    throw new Error(body?.error ?? 'Lecture impossible pour le moment.')
  }
  return result?.drafts ?? []
}
