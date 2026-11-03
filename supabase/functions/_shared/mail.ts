/**
 * E-mails envoyés à l'équipe (signalements, retours des utilisateurs), par l'API de Resend.
 * Secret RESEND_API_KEY (clé « Sending access » du domaine tripmates.app) ; destinataire : secret
 * TEAM_EMAIL, sinon contact@tripmates.app. Sans clé, rien n'est envoyé (les données restent en base).
 */

export type Mail = { subject: string; text: string; replyTo?: string }

const FROM = 'Tripmates <noreply@tripmates.app>'

/** Envoie l'e-mail à l'équipe ; ne lève jamais d'erreur (un e-mail manqué ne doit pas faire échouer l'action) */
export async function mailTeam(mail: Mail): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) {
    console.warn('mail : RESEND_API_KEY absente, e-mail non envoyé :', mail.subject)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [Deno.env.get('TEAM_EMAIL') || 'contact@tripmates.app'],
        subject: mail.subject,
        text: mail.text,
        reply_to: mail.replyTo,
      }),
    })
    if (!res.ok) console.error('mail', res.status, await res.text())
    return res.ok
  } catch (e) {
    console.error('mail', e instanceof Error ? e.message : String(e))
    return false
  }
}

export const REPORT_LABELS: Record<string, string> = {
  inapproprie: 'Contenu choquant ou inapproprié',
  personne: 'On me reconnaît, je n’ai pas donné mon accord',
  droits: 'Ce n’est pas sa photo',
  spam: 'Publicité ou spam',
  autre: 'Autre raison',
}

/** E-mail d'un signalement : motif, nombre de signalements, état de la photo, lien pour la voir */
export function reportMail(r: {
  city: string
  author: string
  reason: string
  details?: string | null
  reports: number
  hidden: boolean
  photoUrl?: string
  photoId: string
}): Mail {
  const state = r.hidden ? 'masquée automatiquement' : `${r.reports}/3 avant masquage`
  return {
    subject: `🚩 Photo signalée à ${r.city} (${state})`,
    text: [
      `Motif : ${REPORT_LABELS[r.reason] ?? r.reason}`,
      r.details ? `Précision : ${r.details}` : null,
      `Photo de ${r.author}, publiée à ${r.city}.`,
      `Signalements : ${r.reports}${r.hidden ? ' — la photo est masquée dans Explorer.' : '.'}`,
      r.reason === 'personne' ? 'Une personne dit être reconnaissable sans accord : à traiter vite (RGPD).' : null,
      r.photoUrl ? `\nVoir la photo (lien valable 7 jours) :\n${r.photoUrl}` : null,
      `\nIdentifiant de la photo : ${r.photoId}`,
      'Que faire : docs/partage.md, section « Modération ».',
    ]
      .filter((l) => l !== null)
      .join('\n'),
  }
}

/** E-mail d'un retour (bug ou idée) envoyé depuis l'app ; « Répondre » écrit à l'utilisateur */
export function feedbackMail(f: {
  kind: 'bug' | 'idee'
  message: string
  name: string
  email?: string
  page?: string
  device?: string
  screenshotUrl?: string
}): Mail {
  const first = f.message.split('\n')[0].slice(0, 60)
  return {
    subject: `${f.kind === 'bug' ? '🐞 Bug' : '💡 Idée'} de ${f.name} : ${first}${f.message.length > 60 ? '…' : ''}`,
    text: [
      f.message,
      '',
      '—',
      `De : ${f.name}${f.email ? ` <${f.email}>` : ''}`,
      f.page ? `Page : ${f.page}` : null,
      f.device ? `Appareil : ${f.device}` : null,
      f.screenshotUrl ? `Capture (lien valable 7 jours) : ${f.screenshotUrl}` : null,
    ]
      .filter((l) => l !== null)
      .join('\n'),
    replyTo: f.email,
  }
}
