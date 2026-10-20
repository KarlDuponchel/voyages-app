const DAY_MS = 86_400_000

/** "2026-11-03" ou "2026-11-03T07:15" → Date locale (sans décalage de fuseau) */
export function parseLocal(value: string): Date {
  const [d, t = '00:00'] = value.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  return new Date(y, m - 1, day, h, min)
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function daysUntil(value: string, now = new Date()): number {
  return Math.round((startOfDay(parseLocal(value)).getTime() - startOfDay(now).getTime()) / DAY_MS)
}

export function nightsBetween(start: string, end: string): number {
  return Math.max(0, Math.round((parseLocal(end).getTime() - parseLocal(start).getTime()) / DAY_MS))
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', opts)

/** 3 → 9 nov. 2026 */
export function formatRange(start: string, end: string, withYear = true): string {
  const s = parseLocal(start)
  const e = parseLocal(end)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const left = sameMonth ? String(s.getDate()) : fmt({ day: 'numeric', month: 'short' }).format(s)
  const right = fmt(withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).format(e)
  return `${left} → ${right}`
}

/** Nov. 2026 */
export function formatMonthYear(value: string): string {
  const txt = fmt({ month: 'short', year: 'numeric' }).format(parseLocal(value))
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

/** DIM. 3 NOV. */
export function formatDayHeader(value: string): string {
  return fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(parseLocal(value)).toUpperCase()
}

/** Dim. 3 nov. */
export function formatShortDate(value: string): string {
  const txt = fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(parseLocal(value))
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export function formatTime(value: string): string {
  return value.split('T')[1] ?? ''
}

export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
