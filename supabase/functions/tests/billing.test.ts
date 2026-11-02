/**
 * Tests du premium côté serveur : signature des webhooks Stripe, lecture des abonnements, messages de quota.
 * Lancer : npm run test:functions
 */
import { assert, assertEquals } from 'jsr:@std/assert@1.0.13'
import { checkoutConsent, formBody, subscriptionRow, verifySignature } from '../_shared/stripe.ts'
import { allowanceMessage } from '../_shared/supabase.ts'

async function sign(payload: string, secret: string, t: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.test('webhook : bonne signature acceptée, mauvaise, trop vieille ou autre secret refusées', async () => {
  const payload = '{"type":"customer.subscription.updated"}'
  const t = 1_800_000_000
  const now = t * 1000 + 10_000
  const v1 = await sign(payload, 'whsec_test', t)
  assert(await verifySignature(payload, `t=${t},v1=${v1}`, 'whsec_test', now))
  assert(await verifySignature(payload, `t=${t},v1=deadbeef,v1=${v1}`, 'whsec_test', now), 'une des signatures suffit')
  assert(!(await verifySignature(payload + ' ', `t=${t},v1=${v1}`, 'whsec_test', now)), 'contenu modifié')
  assert(!(await verifySignature(payload, `t=${t},v1=${v1}`, 'autre', now)), 'autre secret')
  assert(!(await verifySignature(payload, `t=${t},v1=${v1}`, 'whsec_test', now + 600_000)), 'rejeu tardif')
  assert(!(await verifySignature(payload, '', 'whsec_test', now)), 'sans en-tête')
})

Deno.test("abonnement : échéance lue sur l'abonnement ou sur son article selon la version de l'API", () => {
  const base = { id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false }
  const recent = subscriptionRow({ ...base, items: { data: [{ current_period_end: 1_800_000_000, price: { recurring: { interval: 'year' } } }] } })
  assertEquals(recent.current_period_end, new Date(1_800_000_000_000).toISOString())
  assertEquals(recent.billing_interval, 'year')
  const old = subscriptionRow({ ...base, status: 'bizarre', current_period_end: 1_700_000_000 })
  assertEquals(old.current_period_end, new Date(1_700_000_000_000).toISOString())
  assertEquals(old.status, 'incomplete')
  assertEquals(old.billing_interval, null)
})

Deno.test('formulaire Stripe : objets et listes imbriqués, valeurs vides ignorées', () => {
  const body = formBody({ mode: 'subscription', line_items: [{ price: 'price_1', quantity: 1 }], subscription_data: { metadata: { user_id: 'u' } }, automatic_tax: undefined })
  assertEquals(body.map(decodeURIComponent), ['mode=subscription', 'line_items[0][price]=price_1', 'line_items[0][quantity]=1', 'subscription_data[metadata][user_id]=u'])
})

Deno.test('messages de quota : gratuit (passer premium) et premium (limite mensuelle)', () => {
  assert(allowanceMessage({ allowed: false, used: 5, limit: 5, premium: false }).includes('5 lectures offertes'))
  assert(allowanceMessage({ allowed: false, used: 300, limit: 300, premium: true }).includes('300 lectures par l’IA sur 30 jours'))
})

Deno.test('paiement : CGV à accepter, avec le lien et la demande de démarrage immédiat', () => {
  const body = formBody(checkoutConsent('https://tripmates.app/cgv')).map(decodeURIComponent)
  assert(body.includes('consent_collection[terms_of_service]=required'))
  const message = body.find((p) => p.startsWith('custom_text[terms_of_service_acceptance][message]='))
  assert(message?.includes('(https://tripmates.app/cgv)'), 'lien vers les CGV')
  assert(message?.includes('commence immédiatement'), 'démarrage immédiat demandé')
})
