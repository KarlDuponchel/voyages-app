/**
 * Abonnement premium, depuis le profil de l'app.
 *
 * Appel : POST { action: 'checkout', interval: 'month' | 'year' } → { url } de la page de paiement Stripe ;
 *         POST { action: 'portal' } → { url } du portail client (carte, factures, résiliation).
 * La table subscriptions n'est mise à jour que par stripe-webhook, une fois le paiement confirmé.
 */
import { checkoutConsent, stripeApi } from '../_shared/stripe.ts'
import { adminClient, corsHeaders, json, userClient } from '../_shared/supabase.ts'

const appUrl = () => (Deno.env.get('APP_URL') || 'https://tripmates.app').replace(/\/$/, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const { data: auth } = await userClient(authorization).auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    const user = auth.user
    if (!user) return json({ error: 'Connexion requise' }, 401)

    const body = (await req.json().catch(() => ({}))) as { action?: unknown; interval?: unknown }
    const admin = adminClient()
    const { data: sub } = await admin.from('subscriptions').select('status, stripe_customer_id').eq('user_id', user.id).maybeSingle()

    if (body.action === 'portal') {
      if (!sub?.stripe_customer_id) return json({ error: 'Aucun abonnement à gérer.' }, 404)
      const portal = await stripeApi<{ url: string }>('POST', '/billing_portal/sessions', {
        customer: sub.stripe_customer_id,
        return_url: `${appUrl()}/profil`,
        locale: 'fr',
      })
      return json({ url: portal.url })
    }

    if (body.action !== 'checkout') return json({ error: 'Action inconnue' }, 400)
    if (sub?.status === 'offert') return json({ error: 'Votre premium est déjà offert.' }, 409)
    if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) return json({ error: 'Vous êtes déjà premium.' }, 409)
    const price = Deno.env.get(body.interval === 'year' ? 'STRIPE_PRICE_YEAR' : 'STRIPE_PRICE_MONTH')
    if (!price) return json({ error: 'Le paiement n’est pas encore ouvert.' }, 503)

    // Un client Stripe par compte, gardé pour les paiements suivants
    let customer = sub?.stripe_customer_id as string | undefined
    if (!customer) {
      const created = await stripeApi<{ id: string }>('POST', '/customers', { email: user.email, metadata: { user_id: user.id } })
      customer = created.id
      const { error } = sub
        ? await admin.from('subscriptions').update({ stripe_customer_id: customer }).eq('user_id', user.id)
        : await admin.from('subscriptions').insert({ user_id: user.id, status: 'incomplete', stripe_customer_id: customer })
      if (error) throw error
    }

    const tax = Deno.env.get('STRIPE_AUTOMATIC_TAX') === 'true'
    const session = await stripeApi<{ url: string }>('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      automatic_tax: tax ? { enabled: true } : undefined,
      customer_update: tax ? { address: 'auto' } : undefined,
      locale: 'fr',
      ...checkoutConsent(`${appUrl()}/cgv`),
      success_url: `${appUrl()}/profil?premium=merci`,
      cancel_url: `${appUrl()}/profil`,
    })
    return json({ url: session.url })
  } catch (e) {
    console.error(e)
    // En mode test (sandbox), on montre l'erreur de Stripe pour régler la configuration sans fouiller les journaux
    const testMode = Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_')
    const detail = testMode && e instanceof Error ? ` (${e.message})` : ''
    return json({ error: `Paiement indisponible pour le moment. Réessayez plus tard.${detail}` }, 500)
  }
})
