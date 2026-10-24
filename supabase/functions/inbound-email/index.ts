/**
 * B. E-mails de confirmation transférés à {alias}@{domaine d'import}.
 *
 * Le relais Cloudflare (dossier email-worker/) reçoit l'e-mail, le décode et l'envoie ici :
 * POST { to: string[], from: string[], subject, text, html, attachments: [{ filename, mimeType, content (base64) }] }
 * avec l'en-tête x-inbound-secret.
 *
 * Contrôles : le secret partagé, l'alias, et l'expéditeur, qui doit être l'adresse du compte
 * (l'utilisateur transfère lui-même l'e-mail). L'IA lit ensuite l'e-mail et ses pièces jointes,
 * et le résultat attend la validation de l'utilisateur dans l'app (table pending_imports).
 * On répond toujours vite et sans détail : un e-mail refusé ne doit rien révéler.
 */
import { aliasOf, emailOf, htmlToText, safeName, sameSecret } from '../_shared/email.ts'
import { extractBookings, ExtractError, newClient, partFromFile, type Part } from '../_shared/extract.ts'
import { adminClient, dailyLimit, recordUsage, suggestTrip, today, usedToday } from '../_shared/supabase.ts'

/** Fourni par l'environnement d'exécution Supabase : poursuit un travail après la réponse */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

type Attachment = { filename?: string | null; mimeType?: string; content?: string }
type Payload = { to?: string[]; from?: string[]; subject?: string; text?: string; html?: string; attachments?: Attachment[] }

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BASE64 = 14_000_000
/** Au-delà, le texte de l'e-mail n'apporte plus rien (pieds de page, mentions légales…) */
const MAX_TEXT_CHARS = 60_000

const ok = () => new Response('ok', { status: 202 })

const decodeBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

async function handle(payload: Payload): Promise<void> {
  const admin = adminClient()

  // 1. À qui est destiné l'e-mail ?
  const alias = (payload.to ?? []).map(aliasOf).find((a) => a !== null)
  if (!alias) return
  const { data: address } = await admin.from('import_addresses').select('user_id').eq('alias', alias).maybeSingle()
  if (!address) return
  const userId: string = address.user_id

  // 2. L'expéditeur est-il le titulaire du compte ?
  const { data: account } = await admin.auth.admin.getUserById(userId)
  const accountEmail = account.user?.email?.toLowerCase()
  const senders = (payload.from ?? []).map(emailOf)
  if (!accountEmail || !senders.includes(accountEmail)) {
    console.warn('inbound-email : expéditeur différent du titulaire, e-mail ignoré')
    return
  }

  // 3. On enregistre l'e-mail tout de suite : il apparaît « en cours de lecture » dans l'app
  const subject = (payload.subject ?? '').slice(0, 300)
  const { data: row, error: insertError } = await admin
    .from('pending_imports')
    .insert({ user_id: userId, from_email: senders[0], subject, status: 'en_cours' })
    .select('id')
    .single()
  if (insertError || !row) throw insertError ?? new Error('insertion impossible')
  const importId: string = row.id

  const fail = async (message: string) => {
    await admin.from('pending_imports').update({ status: 'erreur', error: message }).eq('id', importId)
  }

  try {
    if ((await usedToday(admin, userId)) >= dailyLimit()) {
      await fail(`Limite de ${dailyLimit()} lectures par l’IA sur 24 h atteinte : cet e-mail n'a pas été lu.`)
      return
    }

    // 4. Pièces jointes lisibles (PDF, images) : gardées pour être jointes aux réservations
    const parts: Part[] = []
    const files: { path: string; name: string; mimeType: string; size: number }[] = []
    for (const a of (payload.attachments ?? []).slice(0, MAX_ATTACHMENTS)) {
      if (!a.content || !a.mimeType || a.content.length > MAX_ATTACHMENT_BASE64) continue
      const part = partFromFile(a.mimeType, a.content, a.filename ?? undefined)
      if (!part) continue
      const bytes = decodeBase64(a.content)
      const name = a.filename || 'piece-jointe'
      const path = `${userId}/${importId}/${crypto.randomUUID().slice(0, 8)}-${safeName(name)}`
      const { error } = await admin.storage.from('imports').upload(path, bytes, { contentType: a.mimeType })
      if (error) {
        console.error('imports upload', error.message)
        continue
      }
      parts.push(part)
      files.push({ path, name, mimeType: a.mimeType, size: bytes.length })
    }

    const body = (payload.text?.trim() || htmlToText(payload.html ?? '')).slice(0, MAX_TEXT_CHARS)
    parts.unshift({ type: 'text', text: `E-mail transféré\nObjet : ${subject}\n\n${body}` })

    // 5. Lecture par l'IA
    const result = await extractBookings(newClient(), parts, { today: today() })
    await recordUsage(admin, { user_id: userId, source: 'email', model: result.model, input_tokens: result.inputTokens, output_tokens: result.outputTokens })

    // 6. Voyage correspondant, parmi ceux que l'utilisateur peut modifier
    const { data: trips } = await admin
      .from('trip_members')
      .select('role, trips ( id, start_date, end_date )')
      .eq('user_id', userId)
      .in('role', ['owner', 'editor'])
    const candidates = (trips ?? []).flatMap((m) => (m.trips ? [m.trips as unknown as { id: string; start_date: string; end_date: string }] : []))

    await admin
      .from('pending_imports')
      .update({
        status: result.drafts.length > 0 ? 'a_valider' : 'erreur',
        error: result.drafts.length > 0 ? null : "Aucune réservation trouvée dans cet e-mail.",
        drafts: result.drafts,
        files,
        suggested_trip_id: suggestTrip(candidates, result.drafts[0]?.start),
      })
      .eq('id', importId)
  } catch (e) {
    console.error(e)
    await fail(e instanceof ExtractError ? e.message : "La lecture de l'e-mail a échoué. Ajoutez la réservation à la main.")
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 })
  const secret = Deno.env.get('INBOUND_SECRET')
  if (!secret || !sameSecret(req.headers.get('x-inbound-secret') ?? '', secret)) return new Response('Non autorisé', { status: 401 })

  const payload = (await req.json().catch(() => null)) as Payload | null
  if (!payload) return new Response('Requête invalide', { status: 400 })

  // Réponse immédiate ; la lecture (quelques secondes) continue en arrière-plan
  EdgeRuntime.waitUntil(handle(payload).catch((e) => console.error('inbound-email', e)))
  return ok()
})
