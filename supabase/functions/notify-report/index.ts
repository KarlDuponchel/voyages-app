/**
 * Prévient l'équipe par e-mail d'un signalement de photo publique, appelée par l'app juste après le signalement.
 *
 * Appel : POST { photoId } avec la session de l'utilisateur. On vérifie qu'il a bien signalé cette photo,
 * puis l'e-mail donne le motif, le nombre de signalements, si la photo est masquée (3 signalements)
 * et un lien pour la voir, valable 7 jours.
 */
import { mailTeam, reportMail } from '../_shared/mail.ts'
import { adminClient, corsHeaders, json, userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const { data: auth } = await userClient(authorization).auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    const user = auth.user
    if (!user) return json({ error: 'Connexion requise' }, 401)
    const { photoId } = (await req.json().catch(() => ({}))) as { photoId?: unknown }
    if (typeof photoId !== 'string') return json({ error: 'Requête incomplète' }, 400)

    const admin = adminClient()
    const { data: mine } = await admin.from('photo_reports').select('reason, details').eq('photo_id', photoId).eq('reporter_id', user.id).maybeSingle()
    if (!mine) return json({ sent: false })

    const [{ data: share }, { count }, { data: photo }] = await Promise.all([
      admin.from('photo_shares').select('city, hidden_at, profiles:author_id ( display_name )').eq('photo_id', photoId).maybeSingle(),
      admin.from('photo_reports').select('photo_id', { count: 'exact', head: true }).eq('photo_id', photoId),
      admin.from('trip_photos').select('thumb_path').eq('id', photoId).maybeSingle(),
    ])
    if (!share) return json({ sent: false })
    const link = photo ? await admin.storage.from('trip-photos').createSignedUrl(photo.thumb_path, 7 * 24 * 3600) : null

    const sent = await mailTeam(
      reportMail({
        city: share.city,
        author: (share.profiles as unknown as { display_name: string } | null)?.display_name ?? 'quelqu’un',
        reason: mine.reason,
        details: mine.details,
        reports: count ?? 1,
        hidden: !!share.hidden_at,
        photoUrl: link?.data?.signedUrl,
        photoId,
      }),
    )
    return json({ sent })
  } catch (e) {
    console.error('notify-report', e)
    return json({ error: 'Alerte non envoyée' }, 500)
  }
})
