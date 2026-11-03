/**
 * Retour d'un utilisateur (bug ou idée), depuis le profil de l'app.
 *
 * Appel : POST { kind: 'bug' | 'idee', message, page?, device?, screenshotPath? } avec la session de l'utilisateur.
 * Le retour est enregistré (table feedback), puis envoyé par e-mail à l'équipe, avec l'adresse de l'utilisateur
 * en « Répondre à ». Au plus 10 envois par 24 h et par personne.
 */
import { feedbackMail, mailTeam } from '../_shared/mail.ts'
import { adminClient, corsHeaders, json, userClient } from '../_shared/supabase.ts'

const DAILY_LIMIT = 10
const clip = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const { data: auth } = await userClient(authorization).auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    const user = auth.user
    if (!user) return json({ error: 'Connexion requise' }, 401)

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const kind = body.kind === 'bug' || body.kind === 'idee' ? body.kind : null
    const message = clip(body.message, 4000)
    if (!kind || !message) return json({ error: 'Écrivez quelques mots avant d’envoyer.' }, 400)
    // Une capture n'est acceptée que dans le dossier de l'utilisateur
    const screenshot = clip(body.screenshotPath, 300)
    const screenshotPath = screenshot?.startsWith(`${user.id}/`) ? screenshot : null

    const admin = adminClient()
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count } = await admin.from('feedback').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since)
    if ((count ?? 0) >= DAILY_LIMIT) return json({ error: 'Merci pour tous ces retours ! Vous pourrez en envoyer d’autres demain.' }, 429)

    const page = clip(body.page, 300)
    const device = clip(body.device, 500)
    const { error } = await admin.from('feedback').insert({ user_id: user.id, kind, message, page, device, screenshot_path: screenshotPath })
    if (error) throw error

    const [{ data: profile }, link] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
      screenshotPath ? admin.storage.from('feedback').createSignedUrl(screenshotPath, 7 * 24 * 3600) : Promise.resolve(null),
    ])
    await mailTeam(
      feedbackMail({
        kind,
        message,
        name: profile?.display_name || 'Un utilisateur',
        email: user.email,
        page: page ?? undefined,
        device: device ?? undefined,
        screenshotUrl: link?.data?.signedUrl,
      }),
    )
    return json({ ok: true })
  } catch (e) {
    console.error('feedback', e)
    return json({ error: 'L’envoi a échoué. Réessayez dans un moment, ou écrivez à contact@tripmates.app.' }, 500)
  }
})
