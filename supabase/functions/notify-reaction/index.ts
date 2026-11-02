/**
 * Prévient l'auteur d'une photo publique qu'on y a réagi, appelée par l'app juste après une réaction.
 *
 * Appel : POST { photoId } avec la session de l'utilisateur. Au plus une notification par heure et
 * par photo : les réactions arrivées entre-temps sont regroupées dans la suivante.
 */
import { notifyUser, reactionNotification, type ReactionKind } from '../_shared/push.ts'
import { adminClient, corsHeaders, json, userClient } from '../_shared/supabase.ts'

const QUIET_MS = 3600_000

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
    const { data: share } = await admin.from('photo_shares').select('author_id, city, hidden_at, last_notified_at').eq('photo_id', photoId).maybeSingle()
    // Rien à dire : photo retirée ou masquée, ou réaction à sa propre photo
    if (!share || share.hidden_at || share.author_id === user.id) return json({ sent: false })

    // Seul quelqu'un qui a vraiment réagi déclenche l'envoi
    const { data: mine } = await admin.from('photo_reactions').select('kind').eq('photo_id', photoId).eq('user_id', user.id).maybeSingle()
    if (!mine) return json({ sent: false })

    const since = share.last_notified_at
    if (since && Date.now() - Date.parse(since) < QUIET_MS) return json({ sent: false })

    // On réserve l'envoi (deux appels simultanés n'en enverront qu'un)
    const now = new Date().toISOString()
    let claim = admin.from('photo_shares').update({ last_notified_at: now }).eq('photo_id', photoId)
    claim = since ? claim.eq('last_notified_at', since) : claim.is('last_notified_at', null)
    const { data: claimed } = await claim.select('photo_id')
    if (!claimed?.length) return json({ sent: false })

    let query = admin
      .from('photo_reactions')
      .select('kind, created_at, profiles ( display_name )')
      .eq('photo_id', photoId)
      .neq('user_id', share.author_id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (since) query = query.gt('created_at', since)
    const { data: reactions } = await query
    const list = (reactions ?? []).map((r) => ({
      kind: r.kind as ReactionKind,
      name: (r.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Quelqu’un',
    }))
    if (list.length === 0) return json({ sent: false })

    const sent = await notifyUser(admin, share.author_id, reactionNotification(share.city, list))
    return json({ sent: sent > 0 })
  } catch (e) {
    console.error('notify-reaction', e)
    return json({ sent: false }, 500)
  }
})
