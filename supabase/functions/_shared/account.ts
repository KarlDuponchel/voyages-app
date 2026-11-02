/**
 * Suppression de compte : ce qui se décide sans base ni réseau (testé dans tests/account.test.ts).
 */

export type StoredFile = { bucket_id: string; name: string }

/** Fichiers regroupés par bucket, par lots (l'API du stockage en accepte 1 000 par appel ; 100 reste prudent) */
export function removalBatches(files: StoredFile[], size = 100): { bucket: string; paths: string[] }[] {
  const byBucket = new Map<string, string[]>()
  for (const f of files) byBucket.set(f.bucket_id, [...(byBucket.get(f.bucket_id) ?? []), f.name])
  return [...byBucket].flatMap(([bucket, paths]) =>
    Array.from({ length: Math.ceil(paths.length / size) }, (_, i) => ({ bucket, paths: paths.slice(i * size, (i + 1) * size) })),
  )
}

/** Abonnement Stripe encore facturable, à résilier avant d'effacer le compte (un premium offert n'a rien chez Stripe) */
export function subscriptionToCancel(sub: { status: string; stripe_subscription_id: string | null } | null): string | null {
  if (!sub?.stripe_subscription_id || ['canceled', 'incomplete_expired', 'offert'].includes(sub.status)) return null
  return sub.stripe_subscription_id
}
