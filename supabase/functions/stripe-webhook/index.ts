/**
 * Webhooks Stripe : tient la table subscriptions à jour (paiement, renouvellement, retard, résiliation).
 *
 * Événements à cocher dans Stripe : checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 * Secrets : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */
import { stripeApi, subscriptionRow, verifySignature, type StripeSubscription } from '../_shared/stripe.ts'
import { adminClient } from '../_shared/supabase.ts'

type StripeEvent = { type: string; data: { object: Record<string, unknown> } }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 })
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const payload = await req.text()
  if (!secret || !(await verifySignature(payload, req.headers.get('stripe-signature') ?? '', secret))) return new Response('Signature invalide', { status: 400 })

  const event = JSON.parse(payload) as StripeEvent
  const admin = adminClient()

  try {
    let sub: StripeSubscription | null = null
    let userId: string | undefined
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { subscription?: string; client_reference_id?: string }
      if (!session.subscription) return new Response('ok')
      sub = await stripeApi<StripeSubscription>('GET', `/subscriptions/${session.subscription}`)
      userId = session.client_reference_id
    } else if (event.type.startsWith('customer.subscription.')) {
      // On relit l'abonnement : les événements peuvent arriver dans le désordre
      const id = (event.data.object as { id: string }).id
      sub = await stripeApi<StripeSubscription>('GET', `/subscriptions/${id}`)
    } else {
      return new Response('ok')
    }

    userId ??= sub.metadata?.user_id
    if (!userId) {
      const { data } = await admin.from('subscriptions').select('user_id').eq('stripe_customer_id', sub.customer).maybeSingle()
      userId = data?.user_id
    }
    if (!userId) {
      console.warn('stripe-webhook : abonnement sans compte', sub.id)
      return new Response('ok')
    }

    // Un premium offert à la main n'est pas remplacé par Stripe
    const { data: current } = await admin.from('subscriptions').select('status').eq('user_id', userId).maybeSingle()
    if (current?.status === 'offert') return new Response('ok')

    const { error } = await admin.from('subscriptions').upsert({ user_id: userId, ...subscriptionRow(sub) })
    if (error) throw error
    return new Response('ok')
  } catch (e) {
    console.error('stripe-webhook', e)
    // 500 : Stripe renverra l'événement plus tard
    return new Response('Erreur', { status: 500 })
  }
})
