/**
 * A. Lecture d'un billet (PDF ou capture) par l'IA, à l'ajout d'une réservation.
 *
 * Appel : POST { tripId, file: { name, mimeType, data (base64) } } avec la session de l'utilisateur.
 * Réponse : { drafts: BookingDraft[] } — rien n'est enregistré : l'app pré-remplit le formulaire
 * et l'utilisateur valide.
 */
import { ExtractError, extractBookings, newClient, partFromFile } from '../_shared/extract.ts'
import { adminClient, corsHeaders, dailyLimit, json, recordUsage, today, usedToday, userClient } from '../_shared/supabase.ts'

/** ~10 Mo de fichier une fois encodé en base64 */
const MAX_BASE64_CHARS = 14_000_000

type Body = { tripId?: unknown; file?: { name?: unknown; mimeType?: unknown; data?: unknown } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const supabase = userClient(authorization)
    const { data: auth } = await supabase.auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    const user = auth.user
    if (!user) return json({ error: 'Connexion requise' }, 401)

    const body = (await req.json().catch(() => ({}))) as Body
    const tripId = typeof body.tripId === 'string' ? body.tripId : ''
    const name = typeof body.file?.name === 'string' ? body.file.name.slice(0, 200) : 'billet'
    const mimeType = typeof body.file?.mimeType === 'string' ? body.file.mimeType : ''
    const data = typeof body.file?.data === 'string' ? body.file.data : ''
    if (!tripId || !data) return json({ error: 'Requête incomplète' }, 400)
    if (data.length > MAX_BASE64_CHARS) return json({ error: 'Fichier trop lourd pour être lu par l’IA (10 Mo maximum).' }, 413)

    const part = partFromFile(mimeType, data, name)
    if (!part) return json({ error: 'Ce format ne peut pas être lu par l’IA : utilisez un PDF ou une image JPEG, PNG ou WebP.' }, 415)

    // Seuls ceux qui peuvent ajouter des réservations à ce voyage peuvent le faire lire (RLS)
    const { data: member } = await supabase.from('trip_members').select('role').eq('trip_id', tripId).eq('user_id', user.id).maybeSingle()
    if (!member || !['owner', 'editor'].includes(member.role)) return json({ error: 'Vous ne pouvez pas modifier ce voyage.' }, 403)

    const admin = adminClient()
    if ((await usedToday(admin, user.id)) >= dailyLimit())
      return json({ error: `Limite de ${dailyLimit()} lectures par l’IA sur 24 h atteinte. Remplissez à la main ou réessayez demain.` }, 429)

    const { data: trip } = await supabase
      .from('trips')
      .select('title, start_date, end_date, trip_destinations ( city, position )')
      .eq('id', tripId)
      .single()

    const result = await extractBookings(newClient(), [part], {
      today: today(),
      trip: trip
        ? {
            title: trip.title,
            start: trip.start_date,
            end: trip.end_date,
            places: [...(trip.trip_destinations ?? [])].sort((a, b) => a.position - b.position).map((d) => d.city),
          }
        : undefined,
    })
    await recordUsage(admin, { user_id: user.id, source: 'fichier', model: result.model, input_tokens: result.inputTokens, output_tokens: result.outputTokens })

    return json({ drafts: result.drafts })
  } catch (e) {
    if (e instanceof ExtractError) return json({ error: e.message }, 422)
    console.error(e)
    return json({ error: 'Lecture impossible pour le moment. Remplissez à la main ou réessayez.' }, 500)
  }
})
