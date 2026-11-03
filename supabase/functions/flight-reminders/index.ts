/**
 * Rappel la veille d'un vol : appelée toutes les heures par pg_cron (migration 20261103160000_rappels_vol.sql).
 *
 * Appel : POST, en-tête x-cron-secret égal au secret CRON_SECRET (le même que « cron_secret » dans le coffre
 * de Supabase). Pour chaque vol qui part dans 22 à 26 h, une notification à chaque voyageur du voyage,
 * puis reminded_at est rempli : un seul rappel par vol, même si l'appel est répété.
 */
import { flightReminder, notifyUser } from '../_shared/push.ts'
import { adminClient, corsHeaders, json } from '../_shared/supabase.ts'

type Due = { booking_id: string; trip_id: string; title: string; starts_at: string; ticket: Record<string, string> | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Non autorisé' }, 401)

  try {
    const admin = adminClient()
    const { data, error } = await admin.rpc('due_flight_reminders')
    if (error) throw error
    let sent = 0
    for (const flight of (data ?? []) as Due[]) {
      // On réserve le vol d'abord : deux appels simultanés n'enverront qu'un rappel
      const { data: claimed } = await admin
        .from('bookings')
        .update({ reminded_at: new Date().toISOString() })
        .eq('id', flight.booking_id)
        .is('reminded_at', null)
        .select('id')
      if (!claimed?.length) continue
      const { data: members } = await admin.from('trip_members').select('user_id').eq('trip_id', flight.trip_id)
      const payload = flightReminder(flight)
      for (const m of members ?? []) sent += await notifyUser(admin, m.user_id, payload)
    }
    return json({ flights: data?.length ?? 0, sent })
  } catch (e) {
    console.error('flight-reminders', e)
    return json({ error: 'Rappels de vol en échec' }, 500)
  }
})
