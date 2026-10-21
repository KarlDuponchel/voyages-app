import { createClient } from '@supabase/supabase-js'
import type { Database } from '../data/database.types'

/**
 * Client Supabase partagé (URL et clé publique dans le fichier .env).
 * Types générés depuis la base : npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/data/database.types.ts
 */
export const supabase = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Message d'erreur lisible pour l'utilisateur. */
export function errorMessage(e: unknown): string {
  if (!navigator.onLine) return 'Pas de connexion internet. Réessayez une fois connecté.'
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message
  return 'Une erreur est survenue.'
}
