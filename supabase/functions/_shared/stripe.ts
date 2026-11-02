/**
 * Stripe, par son API REST (sans dépendance) : paiement de l'abonnement premium (Checkout),
 * portail client (changer de carte, résilier) et webhooks qui tiennent la table subscriptions à jour.
 */

const API = 'https://api.stripe.com/v1'

/** Corps « application/x-www-form-urlencoded » à la manière de Stripe (a[b][0]=…) */
export function formBody(params: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(params).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}[${key}]` : key
    if (value === undefined || value === null) return []
    if (Array.isArray(value)) return value.flatMap((v, i) => (typeof v === 'object' ? formBody(v as Record<string, unknown>, `${name}[${i}]`) : [`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(v))}`]))
    if (typeof value === 'object') return formBody(value as Record<string, unknown>, name)
    return [`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`]
  })
}

export async function stripeApi<T>(method: 'GET' | 'POST', path: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('Variable STRIPE_SECRET_KEY manquante')
  const body = formBody(params).join('&')
  const res = await fetch(`${API}${path}${method === 'GET' && body ? `?${body}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? body : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe ${path} : ${data?.error?.message ?? res.status}`)
  return data as T
}

/**
 * Acceptation obligatoire des CGV au paiement, avec la demande de démarrage immédiat
 * (article L. 221-25 du Code de la consommation : en cas de rétractation, la période utilisée reste due).
 * Stripe exige aussi l'adresse des CGV dans ses réglages (Paramètres → Informations publiques).
 */
export function checkoutConsent(cgvUrl: string) {
  return {
    consent_collection: { terms_of_service: 'required' },
    custom_text: {
      terms_of_service_acceptance: {
        message: `J'accepte les [conditions générales de vente](${cgvUrl}) et je demande que le Premium commence immédiatement. Si je me rétracte dans les 14 jours, la période déjà utilisée reste due.`,
      },
    },
  }
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Signature d'un webhook (en-tête Stripe-Signature « t=…,v1=… »), à 5 minutes près */
export async function verifySignature(payload: string, header: string, secret: string, now = Date.now(), toleranceSeconds = 300): Promise<boolean> {
  const parts = header.split(',').map((p) => p.trim().split('='))
  const t = Number(parts.find(([k]) => k === 't')?.[1])
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!Number.isFinite(t) || signatures.length === 0 || Math.abs(now / 1000 - t) > toleranceSeconds) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)))
  return signatures.some((s) => s.length === expected.length && [...s].reduce((diff, c, i) => diff | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0)
}

export type StripeSubscription = {
  id: string
  customer: string
  status: string
  cancel_at_period_end: boolean
  current_period_end?: number
  metadata?: Record<string, string>
  items?: { data: { current_period_end?: number; price?: { recurring?: { interval?: string } } }[] }
}

const STATUSES = ['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused']

/** Ligne de la table subscriptions pour un abonnement Stripe (l'échéance a changé de place selon la version de l'API) */
export function subscriptionRow(sub: StripeSubscription) {
  const item = sub.items?.data?.[0]
  const periodEnd = sub.current_period_end ?? item?.current_period_end
  const interval = item?.price?.recurring?.interval
  return {
    status: STATUSES.includes(sub.status) ? sub.status : 'incomplete',
    billing_interval: interval === 'month' || interval === 'year' ? interval : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
  }
}
