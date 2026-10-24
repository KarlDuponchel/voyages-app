/** Traitement des e-mails transférés (inbound-email), séparé pour être testé. */

/** Comparaison en temps constant du secret partagé */
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

/** « Voyages <ab12cd34ef56+vol@import.example.fr> » → « ab12cd34ef56 » */
export function aliasOf(address: string): string | null {
  const m = address.toLowerCase().match(/([a-z0-9._+-]+)@/)
  const local = m?.[1].split('+')[0]
  return local && /^[a-z0-9]{8,32}$/.test(local) ? local : null
}

export const emailOf = (address: string) => address.toLowerCase().match(/[^\s<>"]+@[^\s<>"]+/)?.[0] ?? ''

/** Texte brut à partir du HTML, quand l'e-mail n'a pas de version texte */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** « Billet Air France.pdf » → « billet-air-france.pdf » */
export function safeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const clean = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const base = clean(dot > 0 ? name.slice(0, dot) : name).slice(0, 60) || 'piece-jointe'
  const ext = dot > 0 ? clean(name.slice(dot + 1)).slice(0, 8) : ''
  return ext ? `${base}.${ext}` : base
}
