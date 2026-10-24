import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3'

/** En-têtes pour les appels depuis l'app (navigateur) */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const env = (name: string) => {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Variable ${name} manquante`)
  return v
}

/** Client avec les droits de l'utilisateur : la sécurité par voyage (RLS) s'applique */
export function userClient(authorization: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Client serveur (contourne la RLS) : uniquement pour ce que l'utilisateur ne peut pas écrire lui-même */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Lectures par l'IA autorisées par personne et par 24 h (réglable : secret AI_DAILY_LIMIT) */
export const dailyLimit = () => Number(Deno.env.get('AI_DAILY_LIMIT') || 40)

export async function usedToday(admin: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { count, error } = await admin.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since)
  if (error) throw error
  return count ?? 0
}

export async function recordUsage(
  admin: SupabaseClient,
  row: { user_id: string; source: 'fichier' | 'email'; model: string; input_tokens: number; output_tokens: number },
): Promise<void> {
  const { error } = await admin.from('ai_usage').insert(row)
  if (error) console.error('ai_usage', error.message)
}

export const today = () => new Date().toISOString().slice(0, 10)

/** Ajoute n jours à une date AAAA-MM-JJ */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export type TripDates = { id: string; start_date: string; end_date: string }

/**
 * Voyage dont les dates englobent la première réservation (à deux jours près avant le départ,
 * un jour après le retour) ; le plus court l'emporte s'il y en a plusieurs.
 */
export function suggestTrip(trips: TripDates[], firstStart: string | undefined): string | null {
  if (!firstStart) return null
  const day = firstStart.slice(0, 10)
  const matches = trips.filter((t) => addDays(t.start_date, -2) <= day && day <= addDays(t.end_date, 1))
  const spans = matches.map((t) => ({ id: t.id, days: (Date.parse(t.end_date) - Date.parse(t.start_date)) / 86_400_000 }))
  spans.sort((a, b) => a.days - b.days)
  return spans[0]?.id ?? null
}
