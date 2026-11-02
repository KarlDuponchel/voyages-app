import { supabase } from './supabase'

/**
 * Offre gratuite ou premium (fonction my_plan de la base), et paiement par Stripe (fonction billing).
 * Les quotas sont vérifiés côté serveur ; ici, on ne fait que les afficher.
 */

export type Plan = {
  premium: boolean
  status: string | null
  interval: 'month' | 'year' | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  managedByStripe: boolean
  photoBytes: number
  photoBytesLimit: number
  photoTrips: number
  photoTripsLimit: number | null
  aiUsed: number
  aiLimit: number
  aiMonthly: boolean
}

/** Prix affichés ; ils doivent correspondre à ceux réglés dans Stripe (STRIPE_PRICE_MONTH, STRIPE_PRICE_YEAR) */
export const PRICES = { month: '2,50 €', year: '20 €' } as const

export async function fetchPlan(): Promise<Plan> {
  const { data, error } = await supabase.rpc('my_plan')
  if (error) throw error
  return data as unknown as Plan
}

async function billing(body: Record<string, string>): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('billing', { body })
  if (error) {
    const context = (error as { context?: Response }).context
    const res = context ? await context.json().catch(() => null) : null
    throw new Error(res?.error ?? 'Paiement indisponible pour le moment.')
  }
  if (!data?.url) throw new Error('Paiement indisponible pour le moment.')
  return data.url
}

/** Ouvre la page de paiement Stripe (l'app revient sur le profil ensuite) */
export async function startCheckout(interval: 'month' | 'year'): Promise<void> {
  window.location.assign(await billing({ action: 'checkout', interval }))
}

/** Portail client Stripe : carte, factures, résiliation */
export async function openBillingPortal(): Promise<void> {
  window.location.assign(await billing({ action: 'portal' }))
}

/** « 120 Mo », « 1,2 Go » */
export function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024
  if (mb < 1024) return `${mb < 10 ? mb.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : Math.round(mb)} Mo`
  return `${(mb / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`
}
