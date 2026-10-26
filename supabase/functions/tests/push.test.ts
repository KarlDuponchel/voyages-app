/**
 * Notifications : texte des messages et envoi chiffré de bout en bout vers un faux service de notification
 * (aucun vrai téléphone ni service externe). Lancer : npm run test:functions
 */
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1.0.13'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import { importNotification } from '../_shared/push.ts'

const draft = (title: string) => ({ kind: 'hotel' as const, title, detail: '', start: '2026-11-14T15:00' })

Deno.test('texte : une réservation, plusieurs, aucune', () => {
  const one = importNotification('Vos documents', [draft('Yotel New York')], false)
  assertEquals(one.title, "✈️ Une réservation vient d'atterrir")
  assertEquals(one.body, "Yotel New York est prête à rejoindre votre voyage. Un coup d'œil ?")
  assertEquals(one.url, '/imports')

  const many = importNotification('x', [draft('Vol aller'), draft('Vol retour'), draft('Hôtel'), draft('Voiture')], false)
  assertEquals(many.title, '✈️ 4 réservations débarquent')
  assertEquals(many.body, "Vol aller, Vol retour et 2 autres : vérifiez, et c'est rangé.")

  const none = importNotification('Newsletter', [], false)
  assertEquals(none.title, '🤔 Rien à se mettre sous la dent')
  assertEquals(none.body, 'Pas de réservation dans « Newsletter ».')
})

Deno.test('envoi chiffré (RFC 8291) avec signature VAPID vers un faux service de notification', async () => {
  // Faux service de notification : il note la requête reçue
  let received: { headers: Headers; size: number } | null = null
  const ac = new AbortController()
  const srv = Deno.serve({ port: 0, signal: ac.signal, onListen: () => {} }, async (req) => {
    received = { headers: req.headers, size: (await req.arrayBuffer()).byteLength }
    return new Response(null, { status: 201 })
  })
  const port = (srv.addr as Deno.NetAddr).port

  // Faux téléphone : ses clés de chiffrement, comme celles que donne pushManager.subscribe()
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const p256dh = b64url(await crypto.subtle.exportKey('raw', ua.publicKey))
  const auth = b64url(crypto.getRandomValues(new Uint8Array(16)))

  // Clés de l'app, exportées puis réimportées comme depuis le secret VAPID_KEYS
  const exported = await webpush.exportVapidKeys(await webpush.generateVapidKeys({ extractable: true }))
  const app = await webpush.ApplicationServer.new({ contactInformation: 'https://tripmates.app', vapidKeys: await webpush.importVapidKeys(exported) })

  await app
    .subscribe({ endpoint: `http://localhost:${port}/push/abc`, keys: { p256dh, auth } })
    .pushTextMessage(JSON.stringify(importNotification('x', [draft('Yotel')], false)), { ttl: 3600, urgency: webpush.Urgency.High, topic: 'import' })

  ac.abort()
  await srv.finished
  assert(received, 'aucune requête reçue')
  const r = received as { headers: Headers; size: number }
  assertEquals(r.headers.get('content-encoding'), 'aes128gcm')
  assertMatch(r.headers.get('authorization') ?? '', /^vapid t=.+, k=.+/)
  assertEquals(r.headers.get('topic'), 'import')
  assert(r.size > 100, 'message chiffré vide')
})
