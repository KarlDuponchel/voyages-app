/**
 * Relais e-mail (Cloudflare Email Worker).
 *
 * Cloudflare Email Routing envoie ici tous les e-mails reçus sur le domaine d'import
 * (règle « catch-all »). Le relais décode l'e-mail (texte, HTML, pièces jointes) et le transmet
 * à la fonction Supabase inbound-email, qui vérifie l'alias et l'expéditeur puis le fait lire par l'IA.
 * Le relais ne garde rien.
 */
import PostalMime from 'postal-mime'

interface Env {
  /** URL de la fonction inbound-email (wrangler.toml) */
  INBOUND_URL: string
  /** Secret partagé avec la fonction (npx wrangler secret put INBOUND_SECRET) */
  INBOUND_SECRET: string
}

/** Pièces jointes que l'IA sait lire */
const READABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_EMAIL_BYTES = 25 * 1024 * 1024

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (message.rawSize > MAX_EMAIL_BYTES) {
      message.setReject('E-mail trop volumineux')
      return
    }

    const email = await PostalMime.parse(message.raw, { attachmentEncoding: 'base64' })

    const attachments = email.attachments
      // Les images insérées dans le corps (logos, signatures) ne sont pas des billets
      .filter((a) => READABLE.includes(a.mimeType) && !(a.related && a.mimeType !== 'application/pdf'))
      .filter((a): a is typeof a & { content: string } => typeof a.content === 'string' && a.content.length * 0.75 <= MAX_ATTACHMENT_BYTES)
      .slice(0, MAX_ATTACHMENTS)
      .map((a) => ({ filename: a.filename, mimeType: a.mimeType, content: a.content }))

    const response = await fetch(env.INBOUND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-inbound-secret': env.INBOUND_SECRET },
      body: JSON.stringify({
        to: [message.to],
        // Enveloppe et en-tête « From » : l'un des deux doit être l'adresse du compte
        from: [message.from, email.from?.address].filter((a): a is string => Boolean(a)),
        subject: email.subject ?? '',
        text: email.text ?? '',
        html: email.html ?? '',
        attachments,
      }),
    })
    // Pas de rejet en cas d'erreur : l'expéditeur recevrait un message d'échec ; on le note dans les journaux
    if (!response.ok) console.error(`inbound-email a répondu ${response.status}`)
  },
}
