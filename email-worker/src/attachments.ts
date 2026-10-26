import PostalMime, { type Email } from 'postal-mime'

/**
 * Pièces jointes à transmettre à l'IA.
 *
 * Les expéditeurs et les messageries ne déclarent pas toujours bien le type d'un fichier : un billet PDF
 * arrive souvent en « application/octet-stream ». On reconnaît donc aussi le type à l'extension du nom,
 * et au contenu (un PDF commence par « %PDF », soit « JVBERi » en base64).
 *
 * Un e-mail « transféré en pièce jointe » contient le message d'origine (message/rfc822) : on l'ouvre
 * pour récupérer son texte et ses propres pièces jointes.
 */

export type ReadableAttachment = { filename: string | null; mimeType: string; content: string }

export const READABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
/** Profondeur maximale de messages transférés les uns dans les autres */
const MAX_NESTING = 2

type Attachment = Email['attachments'][number]

/** Type réel d'une pièce jointe lisible par l'IA, ou null */
export function readableType(a: Pick<Attachment, 'mimeType' | 'filename' | 'content'>): string | null {
  // « image/jpg » n'est pas un type officiel, mais certaines messageries l'utilisent
  const declared = a.mimeType?.toLowerCase().split(';')[0].trim().replace(/^image\/jpg$/, 'image/jpeg')
  if (declared && READABLE.includes(declared)) return declared
  const ext = a.filename?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (ext && BY_EXTENSION[ext]) return BY_EXTENSION[ext]
  if (typeof a.content === 'string' && a.content.startsWith('JVBERi')) return 'application/pdf'
  return null
}

const decodeBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export type Collected = {
  attachments: ReadableAttachment[]
  /** Texte des messages d'origine transférés en pièce jointe, à ajouter au corps */
  forwardedText: string[]
  /** Pour les journaux : ce qui a été écarté et pourquoi */
  skipped: string[]
}

export async function collectAttachments(email: Email, depth = 0, acc: Collected = { attachments: [], forwardedText: [], skipped: [] }): Promise<Collected> {
  for (const a of email.attachments) {
    const name = a.filename ?? '(sans nom)'
    const content = typeof a.content === 'string' ? a.content : null

    // Message d'origine joint (« transférer en pièce jointe ») : on l'ouvre
    if (a.mimeType === 'message/rfc822' && content && depth < MAX_NESTING) {
      const inner = await PostalMime.parse(decodeBase64(content), { attachmentEncoding: 'base64' })
      const text = inner.text?.trim()
      if (text) acc.forwardedText.push(`Objet : ${inner.subject ?? ''}\n\n${text}`)
      await collectAttachments(inner, depth + 1, acc)
      continue
    }

    const type = readableType(a)
    if (!type) {
      acc.skipped.push(`${name} (${a.mimeType}) : format non lisible`)
      continue
    }
    // Les images insérées dans le corps (logos, signatures) ne sont pas des billets
    if (a.related && type !== 'application/pdf') {
      acc.skipped.push(`${name} : image du corps de l'e-mail`)
      continue
    }
    if (!content || content.length * 0.75 > MAX_ATTACHMENT_BYTES) {
      acc.skipped.push(`${name} : vide ou trop lourd`)
      continue
    }
    if (acc.attachments.length >= MAX_ATTACHMENTS) {
      acc.skipped.push(`${name} : au-delà de ${MAX_ATTACHMENTS} pièces jointes`)
      continue
    }
    acc.attachments.push({ filename: a.filename, mimeType: type, content })
  }
  return acc
}
