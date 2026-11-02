/**
 * Suppression de son compte (RGPD), depuis le profil de l'app.
 *
 * Appel : POST, sans corps, avec la session de l'utilisateur → { ok: true, files }.
 * Dans l'ordre : 1. résilier l'abonnement Stripe (sinon il serait encore prélevé) ;
 * 2. effacer les fichiers des voyages dont il est le seul membre et ses pièces jointes d'e-mails
 *    (liste : account_files, migration 20261103100000) ; 3. supprimer le compte, ce qui efface en base
 *    son profil, ses voyages sans autre membre et sa place dans les voyages partagés.
 * Une étape qui échoue arrête tout avant la suppression du compte : l'utilisateur peut réessayer.
 */
import { removalBatches, type StoredFile, subscriptionToCancel } from '../_shared/account.ts'
import { stripeApi } from '../_shared/stripe.ts'
import { adminClient, corsHeaders, json, userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const { data: auth } = await userClient(authorization).auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    const user = auth.user
    if (!user) return json({ error: 'Connexion requise' }, 401)

    const admin = adminClient()

    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('status, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (subError) throw subError
    const toCancel = subscriptionToCancel(sub)
    if (toCancel) {
      // Résiliation immédiate ; un abonnement déjà effacé chez Stripe ne bloque pas la suppression
      await stripeApi('DELETE', `/subscriptions/${toCancel}`).catch((e: Error) => {
        if (!e.message.includes('No such subscription')) throw e
      })
    }

    const { data: files, error: filesError } = await admin.rpc('account_files', { p_user: user.id })
    if (filesError) throw filesError
    for (const batch of removalBatches((files ?? []) as StoredFile[])) {
      const { error } = await admin.storage.from(batch.bucket).remove(batch.paths)
      if (error) throw error
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError
    return json({ ok: true, files: files?.length ?? 0 })
  } catch (e) {
    console.error('delete-account', e)
    return json({ error: 'La suppression du compte a échoué. Réessayez dans un moment.' }, 500)
  }
})
