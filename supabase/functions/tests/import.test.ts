/**
 * Tests de la logique serveur de l'import (sans réseau, sans appel facturé à l'API Claude).
 * Lancer : npm run test:functions
 */
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1.0.13'
import { aliasOf, emailOf, htmlToText, safeName, sameSecret } from '../_shared/email.ts'
import { buildRequest, ExtractError, extractBookings, normalizeDrafts, partFromFile, type MessagesClient } from '../_shared/extract.ts'
import { addDays, suggestTrip } from '../_shared/supabase.ts'

// ---- Contrôle des réponses de l'IA ----------------------------------------------------

const flight = {
  kind: 'vol',
  title: 'Paris CDG → Lisbonne LIS',
  detail: 'TAP TP441',
  start_date: '2026-11-03',
  start_time: '7:15',
  end_date: null,
  end_time: '08:40',
  reference: 'X7K2LP',
  provider: 'TAP Air Portugal',
  place: 'Lisbonne',
  ticket: { carrier: 'TAP', number: 'TP441', from: 'CDG', fromCity: 'Paris', to: 'LIS', toCity: 'Lisbonne', departure: '07:15', arrival: '08:40', duration: '2 h 25', passenger: null, seat: '14C', gate: null, boarding: null, cabin: null },
}

Deno.test('un vol complet est conservé, heures normalisées, champs vides retirés', () => {
  const [d] = normalizeDrafts({ bookings: [flight] })
  assertEquals(d.start, '2026-11-03T07:15')
  assertEquals(d.end, '2026-11-03T08:40') // heure d'arrivée le même jour
  assertEquals(d.reference, 'X7K2LP')
  assertEquals(d.ticket?.seat, '14C')
  assert(d.ticket && !('passenger' in d.ticket), 'les champs null ne sont pas recopiés')
})

Deno.test('entrées inutilisables écartées, fin incohérente retirée, type inconnu → autre', () => {
  const drafts = normalizeDrafts({
    bookings: [
      { ...flight, start_date: '03/11/2026' }, // date au mauvais format
      { ...flight, title: '  ' }, // sans titre
      { ...flight, kind: 'fusée', ticket: null, start_date: '2026-11-05', end_date: '2026-11-04', end_time: '10:00' },
    ],
  })
  assertEquals(drafts.length, 1)
  assertEquals(drafts[0].kind, 'autre')
  assertEquals(drafts[0].end, undefined)
})

Deno.test("pas de données de billet pour un hôtel, ni de billet incomplet", () => {
  const [hotel, train] = normalizeDrafts({
    bookings: [
      { ...flight, kind: 'hotel', title: 'Hôtel Memmo', start_date: '2026-11-03', start_time: '15:00', end_date: '2026-11-07', end_time: '11:00' },
      { ...flight, kind: 'train', start_date: '2026-11-08', ticket: { ...flight.ticket, departure: 'midi' } },
    ],
  })
  assertEquals(hotel.ticket, undefined)
  assertEquals(hotel.end, '2026-11-07T11:00')
  assertEquals(train.ticket, undefined)
})

Deno.test('réponse sans liste → aucune réservation ; tri chronologique', () => {
  assertEquals(normalizeDrafts(null), [])
  assertEquals(normalizeDrafts({ autre: 1 }), [])
  const sorted = normalizeDrafts({ bookings: [{ ...flight, start_date: '2026-11-10' }, flight] })
  assertEquals(sorted.map((d) => d.start.slice(0, 10)), ['2026-11-03', '2026-11-10'])
})

// ---- Requête envoyée à Claude ---------------------------------------------------------

Deno.test('requête : PDF, contexte du voyage, sortie structurée, repli en cas de refus', () => {
  const params = buildRequest([{ type: 'pdf', data: 'JVBERi0x', name: 'billet.pdf' }], {
    today: '2026-10-24',
    trip: { title: 'Lisbonne', start: '2026-11-03', end: '2026-11-08', places: ['Lisbonne', 'Porto'] },
    model: 'claude-opus-5-5',
  })
  assertEquals(params.model, 'claude-opus-5-5')
  assertEquals(params.fallbacks, 'default')
  assertEquals(params.betas, ['server-side-fallback-2026-07-01'])
  assertEquals(params.output_config?.format?.type, 'json_schema')
  const content = params.messages[0].content as { type: string; text?: string }[]
  assertEquals(content[0].type, 'document')
  assert(content.at(-1)?.text?.includes('Lisbonne, Porto'), 'contexte du voyage absent')
})

Deno.test("pas de repli serveur pour un modèle qui ne le propose pas (Haiku)", () => {
  const params = buildRequest([{ type: 'text', text: 'x' }], { today: '2026-10-24', model: 'claude-haiku-5-5' })
  assertEquals(params.fallbacks, undefined)
  assertEquals(params.betas, undefined)
})

Deno.test("formats lisibles par l'IA : PDF et images courantes, pas HEIC", () => {
  assertEquals(partFromFile('application/pdf', 'x')?.type, 'pdf')
  assertEquals(partFromFile('image/png', 'x')?.type, 'image')
  assertEquals(partFromFile('image/heic', 'x'), null)
  // PDF déclaré comme fichier binaire : reconnu à son contenu
  assertEquals(partFromFile('application/octet-stream', 'JVBERi0xLjQK')?.type, 'pdf')
})

// ---- Appel (faux client) -------------------------------------------------------------------

function fakeClient(response: Record<string, unknown>): MessagesClient {
  return { beta: { messages: { create: () => Promise.resolve(response) } } } as unknown as MessagesClient
}

const usage = { input_tokens: 5000, output_tokens: 900, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

Deno.test('lecture réussie : réservations et consommation renvoyées', async () => {
  const client = fakeClient({ stop_reason: 'end_turn', model: 'claude-opus-5-5', usage, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify({ bookings: [flight] }) }] })
  const r = await extractBookings(client, [{ type: 'text', text: 'e-mail' }], { today: '2026-10-24' })
  assertEquals(r.drafts.length, 1)
  assertEquals(r.inputTokens, 5000)
  assertEquals(r.outputTokens, 900)
})

Deno.test('refus, réponse tronquée ou illisible → erreur explicite', async () => {
  for (const response of [
    { stop_reason: 'refusal', model: 'm', usage, content: [] },
    { stop_reason: 'max_tokens', model: 'm', usage, content: [{ type: 'text', text: '{"bookings": [' }] },
    { stop_reason: 'end_turn', model: 'm', usage, content: [{ type: 'text', text: 'pas du JSON' }] },
  ])
    await assertRejects(() => extractBookings(fakeClient(response), [], { today: '2026-10-24', model: 'm' }), ExtractError)
})

// ---- E-mails ---------------------------------------------------------------------------------

Deno.test("alias de l'adresse de transfert", () => {
  assertEquals(aliasOf('ab12cd34ef56@import.voyages.fr'), 'ab12cd34ef56')
  assertEquals(aliasOf('Voyages <AB12CD34EF56+vol@import.voyages.fr>'), 'ab12cd34ef56')
  assertEquals(aliasOf('contact@import.voyages.fr'), null) // trop court : pas un alias
  assertEquals(aliasOf('pas une adresse'), null)
})

Deno.test('expéditeur, secret, nom de fichier, HTML', () => {
  assertEquals(emailOf('Karl <Karl.D@Example.fr>'), 'karl.d@example.fr')
  assert(sameSecret('abc', 'abc') && !sameSecret('abc', 'abd') && !sameSecret('abc', 'abcd'))
  assertEquals(safeName('Billet Air France (1).PDF'), 'billet-air-france-1.pdf')
  assertEquals(htmlToText('<style>p{}</style><p>Vol&nbsp;AF1024</p><p>Départ 07:15</p>'), 'Vol AF1024\nDépart 07:15')
})

// ---- Voyage proposé ------------------------------------------------------------------------

Deno.test('voyage proposé : celui dont les dates englobent la réservation, le plus court', () => {
  const trips = [
    { id: 'tour-du-monde', start_date: '2026-10-01', end_date: '2026-12-31' },
    { id: 'lisbonne', start_date: '2026-11-03', end_date: '2026-11-08' },
    { id: 'egypte', start_date: '2027-02-01', end_date: '2027-02-10' },
  ]
  assertEquals(suggestTrip(trips, '2026-11-02T18:00'), 'lisbonne') // la veille du départ
  assertEquals(suggestTrip(trips, '2026-10-15T10:00'), 'tour-du-monde')
  assertEquals(suggestTrip(trips, '2028-01-01T10:00'), null)
  assertEquals(suggestTrip(trips, undefined), null)
  assertEquals(addDays('2026-12-31', 1), '2027-01-01')
})
