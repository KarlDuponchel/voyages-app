/**
 * Tests de la suppression de compte côté serveur : lots de fichiers à effacer, abonnement à résilier.
 * Lancer : npm run test:functions
 */
import { assertEquals } from 'jsr:@std/assert@1.0.13'
import { removalBatches, subscriptionToCancel } from '../_shared/account.ts'

Deno.test('fichiers : regroupés par bucket, par lots de 100 au plus, aucun oublié', () => {
  const files = [
    ...Array.from({ length: 205 }, (_, i) => ({ bucket_id: 'trip-photos', name: `t/p${i}/full.jpg` })),
    { bucket_id: 'trip-files', name: 't/billet.pdf' },
    { bucket_id: 'imports', name: 'u/i/mail.pdf' },
  ]
  const batches = removalBatches(files)
  assertEquals(batches.map((b) => [b.bucket, b.paths.length]), [['trip-photos', 100], ['trip-photos', 100], ['trip-photos', 5], ['trip-files', 1], ['imports', 1]])
  assertEquals(batches.flatMap((b) => b.paths).sort(), files.map((f) => f.name).sort())
  assertEquals(removalBatches([]), [])
})

Deno.test('abonnement : résilié s’il est encore facturable, ignoré s’il est offert, terminé ou absent', () => {
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']) {
    assertEquals(subscriptionToCancel({ status, stripe_subscription_id: 'sub_1' }), 'sub_1', status)
  }
  for (const status of ['canceled', 'incomplete_expired', 'offert']) {
    assertEquals(subscriptionToCancel({ status, stripe_subscription_id: 'sub_1' }), null, status)
  }
  assertEquals(subscriptionToCancel({ status: 'incomplete', stripe_subscription_id: null }), null, 'client sans abonnement')
  assertEquals(subscriptionToCancel(null), null, 'jamais abonné')
})
