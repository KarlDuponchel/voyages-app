/**
 * Relais e-mail (Cloudflare Email Worker).
 *
 * Cloudflare Email Routing envoie ici tous les e-mails reçus sur le domaine d'import
 * (règle « catch-all »). Le relais décode l'e-mail (texte, HTML, pièces jointes) et le transmet
 * à la fonction Supabase inbound-email, qui vérifie l'alias et l'expéditeur puis le fait lire par l'IA.
 * Le relais ne garde rien, à part un journal des noms et types de pièces jointes (pour le dépannage).
 */
import PostalMime from 'postal-mime'
import { collectAttachments } from './attachments'

interface Env {
  /** URL de la fonction inbound-email (wrangler.toml) */
  INBOUND_URL: string
  /** Secret partagé avec la fonction (npx wrangler secret put INBOUND_SECRET) */
  INBOUND_SECRET: string
}

const MAX_EMAIL_BYTES = 25 * 1024 * 1024

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (message.rawSize > MAX_EMAIL_BYTES) {
      message.setReject('E-mail trop volumineux')
      return
    }

    const email = await PostalMime.parse(message.raw, { attachmentEncoding: 'base64' })

    const { attachments, forwardedText, skipped } = await collectAttachments(email)
    // Visible dans les journaux du relais (tableau de bord Cloudflare → Workers → voyages-email → Logs)
    console.log(
      JSON.stringify({
        recues: email.attachments.map((a) => `${a.filename ?? '(sans nom)'} (${a.mimeType})`),
        transmises: attachments.map((a) => `${a.filename ?? '(sans nom)'} (${a.mimeType})`),
        ecartees: skipped,
      }),
    )
    // Corps de l'e-mail, suivi du texte des messages d'origine joints s'il y en a
    const text = [email.text ?? '', ...forwardedText.map((t) => `--- Message d'origine joint ---\n${t}`)].join('\n\n').trim()

    const response = await fetch(env.INBOUND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-inbound-secret': env.INBOUND_SECRET },
      body: JSON.stringify({
        to: [message.to],
        // Enveloppe et en-tête « From » : l'un des deux doit être l'adresse du compte
        from: [message.from, email.from?.address].filter((a): a is string => Boolean(a)),
        subject: email.subject ?? '',
        text,
        html: email.html ?? '',
        attachments,
      }),
    })
    // Pas de rejet en cas d'erreur : l'expéditeur recevrait un message d'échec ; on le note dans les journaux
    if (!response.ok) console.error(`inbound-email a répondu ${response.status}`)
  },
}
