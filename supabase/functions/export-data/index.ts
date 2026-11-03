/**
 * Export de ses données (RGPD : droits d'accès et de portabilité), depuis le profil de l'app.
 *
 * Appel : POST, sans corps, avec la session de l'utilisateur → un fichier JSON lisible.
 * Côté serveur (clé serveur, filtré sur l'utilisateur) : certaines tables ne se lisent pas depuis l'app
 * (lectures par l'IA, signalements). Contenu : compte, profil, offre, pays, voyages (étapes, réservations,
 * membres), ses photos et documents avec un lien de téléchargement valable 7 jours, ses publications,
 * réactions, signalements et blocages, son adresse de transfert et les e-mails reçus, ses appareils
 * abonnés aux notifications (sans leurs clés).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3'
import { adminClient, corsHeaders, json, userClient } from '../_shared/supabase.ts'

const LINK_SECONDS = 7 * 24 * 3600

/** Lignes d'une table, ou l'erreur (une table en échec ne bloque pas l'export) */
async function rows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Liens de téléchargement temporaires, par lots */
async function signedLinks(admin: SupabaseClient, bucket: string, paths: string[]): Promise<Record<string, string>> {
  const links: Record<string, string> = {}
  for (let i = 0; i < paths.length; i += 100) {
    const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths.slice(i, i + 100), LINK_SECONDS)
    if (error) throw error
    for (const d of data ?? []) if (d.path && d.signedUrl) links[d.path] = d.signedUrl
  }
  return links
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const { data: auth } = await userClient(authorization).auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    const user = auth.user
    if (!user) return json({ error: 'Connexion requise' }, 401)

    const admin = adminClient()
    const me = user.id

    const memberships = (await rows(admin.from('trip_members').select('trip_id, role, joined_at').eq('user_id', me))) as { trip_id: string }[]
    const tripIds = memberships.map((m) => m.trip_id)
    const inTrips = <T>(table: string, select: string) =>
      tripIds.length ? (rows(admin.from(table).select(select).in('trip_id', tripIds)) as Promise<T[]>) : Promise.resolve([] as T[])

    const [trips, destinations, bookings, members, bookingFiles, photos] = await Promise.all([
      tripIds.length ? rows(admin.from('trips').select('id, title, start_date, end_date, transport, budget_amount, budget_currency, cover_theme, created_at').in('id', tripIds)) : [],
      inTrips('trip_destinations', 'trip_id, position, city, place_kind, country_code, lat, lng, timezone, arrive_on, leave_on'),
      inTrips('bookings', 'trip_id, kind, title, detail, starts_at, ends_at, timezone, reference, provider, source, ticket, created_at'),
      inTrips('trip_members', 'trip_id, role, profiles ( display_name )'),
      inTrips<{ storage_path: string; uploaded_by: string | null }>('booking_files', 'trip_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at'),
      rows(admin.from('trip_photos').select('id, trip_id, kind, path, mime_type, width, height, duration_seconds, size_bytes, taken_at, created_at, caption').eq('uploaded_by', me)) as Promise<
        { path: string }[]
      >,
    ])

    const myFiles = bookingFiles.filter((f) => f.uploaded_by === me)
    const [photoLinks, fileLinks] = await Promise.all([
      signedLinks(admin, 'trip-photos', photos.map((p) => p.path)),
      signedLinks(admin, 'trip-files', myFiles.map((f) => f.storage_path)),
    ])

    const [profile, subscription, countries, aiUsage, importAddress, pendingImports, shares, reactions, reports, blocks, devices] = await Promise.all([
      rows(admin.from('profiles').select('display_name, home_city, home_lat, home_lng, created_at').eq('id', me).maybeSingle()),
      rows(admin.from('subscriptions').select('status, plan_interval:billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id').eq('user_id', me).maybeSingle()).catch(() => null),
      rows(admin.from('user_countries').select('country_code, first_visited_on, created_at').eq('user_id', me)),
      rows(admin.from('ai_usage').select('source, model, created_at').eq('user_id', me)),
      rows(admin.from('import_addresses').select('alias, created_at').eq('user_id', me).maybeSingle()),
      rows(admin.from('pending_imports').select('received_at, from_email, subject, status, drafts, files').eq('user_id', me)),
      rows(admin.from('photo_shares').select('photo_id, city, caption, published_at').eq('author_id', me)),
      rows(admin.from('photo_reactions').select('photo_id, kind, created_at').eq('user_id', me)),
      rows(admin.from('photo_reports').select('photo_id, reason, details, created_at').eq('reporter_id', me)),
      rows(admin.from('user_blocks').select('blocked_id, created_at').eq('blocker_id', me)),
      rows(admin.from('push_subscriptions').select('user_agent, created_at').eq('user_id', me)).catch(() => []),
    ])

    const exportData = {
      export: {
        service: 'Tripmates (https://tripmates.app)',
        date: new Date().toISOString(),
        liens: 'Les liens de téléchargement des photos et documents sont valables 7 jours.',
        contact: 'contact@tripmates.app',
      },
      compte: { id: me, email: user.email, cree_le: user.created_at, derniere_connexion: user.last_sign_in_at },
      profil: profile,
      offre: subscription,
      pays_visites_saisis: countries,
      lectures_par_ia: aiUsage,
      import_par_email: { adresse: importAddress, emails_recus: pendingImports },
      voyages: (trips as { id: string }[]).map((t) => ({
        ...t,
        mon_role: (memberships as { trip_id: string; role: string }[]).find((m) => m.trip_id === t.id)?.role,
        etapes: (destinations as { trip_id: string }[]).filter((d) => d.trip_id === t.id),
        reservations: (bookings as { trip_id: string }[]).filter((b) => b.trip_id === t.id),
        voyageurs: (members as { trip_id: string }[]).filter((m) => m.trip_id === t.id),
      })),
      mes_photos: photos.map((p) => ({ ...p, telecharger: photoLinks[p.path] })),
      mes_documents: myFiles.map((f) => ({ ...f, telecharger: fileLinks[f.storage_path] })),
      partage: { publications: shares, reactions, signalements: reports, blocages: blocks },
      appareils_notifies: devices,
    }
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (e) {
    console.error('export-data', e)
    return json({ error: 'L’export de vos données a échoué. Réessayez dans un moment.' }, 500)
  }
})
