// Faux Supabase pour les captures de la page d'accueil : données de démonstration fixes.
import { readFileSync } from 'node:fs'
import http from 'node:http'

// Photos Unsplash des couvertures (voir photos/CREDITS.md)
const PHOTOS = new URL('./photos/', import.meta.url)

const USER = { id: 'u1', email: 'camille@test.local', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const dest = (id, position, city, country_code, lat, lng, timezone = 'Europe/Paris') => ({ id, position, city, country_code, lat, lng, timezone })
const members = [
  { user_id: 'u1', role: 'owner', profiles: { display_name: 'Camille' } },
  { user_id: 'u2', role: 'editor', profiles: { display_name: 'Hugo' } },
]
const booking = (id, kind, title, detail, starts_at, ends_at, extra = {}) => ({
  id, kind, title, detail, starts_at, ends_at, timezone: 'Europe/Lisbon', reference: null, provider: null, source: 'manuel', imported_at: null, ticket: null, booking_files: [], ...extra,
})
const trip = (id, title, start_date, end_date, cover_colors, dests, bookings = [], photos = 0, photo = null) => ({
  id, title, start_date, end_date, transport: 'avion', budget_amount: 1450, budget_currency: 'EUR', cover_colors,
  cover: photo && { id: `c-${id}`, path: `${id}/${photo}.jpg`, thumb_path: `${id}/${photo}.jpg` }, photo_count: [{ count: photos }], trip_destinations: dests, bookings, trip_members: members,
})
const TRIPS = [
  trip('t1', 'Lisbonne & Porto', '2026-11-20', '2026-11-27', ['#F26B4B', '#E9AD3A', '#183F37'], [dest('d1', 0, 'Lisbonne', '620', 38.72, -9.14), dest('d2', 1, 'Porto', '620', 41.15, -8.61)], [
    booking('b1', 'vol', 'Paris → Lisbonne', 'TAP Air Portugal TP 433', '2026-11-20T07:15:00', '2026-11-20T08:50:00', {
      reference: 'K8ZT4Q', provider: 'TAP Air Portugal', source: 'import',
      ticket: { carrier: 'TAP Air Portugal', number: 'TP 433', from: 'ORY', fromCity: 'Paris', to: 'LIS', toCity: 'Lisbonne', departure: '07:15', arrival: '08:50', duration: '2 h 35', passenger: 'Camille Martin', seat: '14A', gate: 'B32', boarding: '06:35', cabin: 'Économie' },
    }),
    booking('b2', 'hotel', 'Casa do Largo', 'Alfama · 3 nuits · chambre double', '2026-11-20T15:00:00', '2026-11-23T11:00:00', { reference: '4471902', provider: 'Booking.com' }),
    booking('b3', 'activite', 'Tram 28 et belvédères', 'Visite guidée · 2 personnes', '2026-11-21T10:00:00', '2026-11-21T12:30:00'),
    booking('b4', 'train', 'Lisbonne → Porto', 'Alfa Pendular 133 · voiture 4', '2026-11-23T09:39:00', '2026-11-23T12:24:00', { reference: 'CP-88213' }),
    booking('b5', 'hotel', 'Rosa Et Al Townhouse', 'Cedofeita · 4 nuits', '2026-11-23T15:00:00', '2026-11-27T11:00:00', { reference: 'RT-2291' }),
  ], 0, 'lisbonne'),
  trip('t2', 'Kyoto & Tokyo', '2026-03-28', '2026-04-10', ['#DFE5CF', '#E9AD3A', '#0F302A'], [dest('d3', 0, 'Tokyo', '392', 35.68, 139.69), dest('d4', 1, 'Kyoto', '392', 35.01, 135.77)], [], 86, 'kyoto'),
  trip('t3', 'Road trip en Islande', '2025-12-04', '2025-12-12', ['#183F37', '#597069', '#F7F3E9'], [dest('d5', 0, 'Reykjavik', '352', 64.14, -21.94), dest('d6', 1, 'Vík', '352', 63.42, -19.0)], [], 54, 'islande'),
  trip('t4', 'New York', '2025-09-12', '2025-09-19', ['#F26B4B', '#B99054', '#0F302A'], [dest('d7', 0, 'New York', '840', 40.71, -74.0)], [], 41, 'newyork'),
  trip('t5', 'Cyclades', '2025-06-14', '2025-06-24', ['#E9AD3A', '#DFE5CF', '#366158'], [dest('d8', 0, 'Naxos', '300', 37.1, 25.37), dest('d9', 1, 'Santorin', '300', 36.39, 25.46)], [], 63, 'cyclades'),
  trip('t6', 'Marrakech', '2025-02-20', '2025-02-24', ['#C4472B', '#E9AD3A', '#183F37'], [dest('d10', 0, 'Marrakech', '504', 31.63, -8.0)], [], 28, 'marrakech'),
  trip('t7', 'Mexico & Oaxaca', '2024-11-02', '2024-11-16', ['#F26B4B', '#E9AD3A', '#22493F'], [dest('d11', 0, 'Mexico', '484', 19.43, -99.13), dest('d12', 1, 'Oaxaca', '484', 17.07, -96.72)], [], 77, 'mexico'),
]
const VISITED = ['620', '392', '352', '840', '300', '504', '484', '250', '724', '380', '764', '124', '276', '756']
const TABLES = {
  trips: TRIPS,
  my_visited_countries: VISITED.map((country_code) => ({ country_code })),
  user_countries: [],
  pending_imports: [],
  import_addresses: [{ alias: 'camille' }],
  profiles: [{ id: 'u1', display_name: 'Camille', home_city: 'Paris', home_lat: 48.85, home_lng: 2.35 }],
  // Budget partagé (les mêmes pour chaque voyage) : Camille et Hugo
  expenses: [
    ['e1', 'Dîner à l’Alfama', 8400, 'repas', 'u1', '2026-11-21', [['u1', 4200], ['u2', 4200]]],
    ['e2', 'Casa do Largo', 36000, 'logement', 'u2', '2026-11-20', [['u1', 18000], ['u2', 18000]]],
    ['e3', 'Taxi aéroport', 3200, 'transport', 'u1', '2026-11-20', [['u1', 1600], ['u2', 1600]]],
    ['e4', 'Pastéis de nata', 900, 'repas', 'u2', '2026-11-21', [['u2', 900]]],
  ].map(([id, title, amount_cents, category, paid_by, spent_on, parts]) => ({
    id, title, amount_cents, category, paid_by, spent_on,
    expense_shares: parts.map(([user_id, amount]) => ({ user_id, amount_cents: amount })),
  })),
  settlements: [],
  // Photos de l'onglet Photos (les mêmes pour chaque voyage) : deux de Camille, une de Hugo, une déjà publique
  trip_photos: ['lisbonne', 'cyclades', 'islande', 'kyoto', 'marrakech', 'mexico'].map((nom, i) => ({
    id: `p${i + 1}`,
    kind: 'photo',
    path: `t1/${nom}.jpg`,
    thumb_path: `t1/${nom}.jpg`,
    mime_type: 'image/jpeg',
    width: 1600,
    height: 1200,
    duration_seconds: null,
    size_bytes: 300000,
    taken_at: `2026-11-2${i < 3 ? 1 : 2}T10:0${i}:00Z`,
    created_at: '2026-11-23T10:00:00Z',
    uploaded_by: i === 2 ? 'u2' : 'u1',
    caption: null,
    photo_shares: i === 1 ? { city: 'Lisbonne', destination_id: 'd1', caption: null, hidden_at: null } : null,
  })),
}
const RPC = {
  // Villes tendances de « Souvenirs de la communauté » (accueil /monde)
  public_trending_places: [
    ['Lisbonne', '620', ['lisbonne', 'cyclades', 'islande'], 124, 38, 512, 21],
    ['Kyoto', '392', ['kyoto', 'mexico'], 88, 25, 301, 9],
    ['Marrakech', '504', ['marrakech'], 41, 12, 97, 0],
  ].map(([city, country_code, noms, photo_count, traveler_count, reaction_count, recent_count]) => ({
    city, country_code, photo_count, traveler_count, reaction_count, recent_count, thumb_paths: noms.map((n) => `t1/${n}.jpg`),
  })),
  // Photos publiques d'Explorer : 14 photos pour voir la grille éditoriale sur ordinateur
  public_photos: ['lisbonne', 'kyoto', 'islande', 'marrakech', 'newyork', 'cyclades', 'mexico'].flatMap((nom, i) =>
    [0, 1].map((k) => ({
      photo_id: `pub-${nom}-${k}`, kind: 'photo', path: `pub/${nom}.jpg`, thumb_path: `pub/${nom}.jpg`, width: 1600, height: 1200, duration_seconds: null,
      taken_month: '2026-10-01', city: ['Lisbonne', 'Kyoto', 'Reykjavik', 'Marrakech', 'New York', 'Santorin', 'Mexico'][i], country_code: ['620', '392', '352', '504', '840', '300', '484'][i],
      caption: null, published_at: `2026-10-${String(20 - i * 2 - k).padStart(2, '0')}T10:00:00Z`, author_id: k ? 'u2' : 'u3', author_name: k ? 'Hugo' : 'Léa', reactions: { envie: 12 + i }, my_reaction: null,
    })),
  ),
  public_places: [],
  search_places: [
    { id: 2267057, name: 'Lisbonne', admin1: 'District de Lisbonne', country_code: 'PT', lat: 38.72509, lng: -9.1498, timezone: 'Europe/Lisbon', kind: 'ville' },
    { id: 2629691, name: 'Islande', admin1: null, country_code: 'IS', lat: 64.13548, lng: -21.89541, timezone: 'Atlantic/Reykjavik', kind: 'pays' },
    { id: 2513925, name: 'Minorque', admin1: 'Îles Baléares', country_code: 'ES', lat: 39.97466, lng: 4.07405, timezone: 'Europe/Madrid', kind: 'ile' },
    { id: 3030293, name: 'Bretagne', admin1: null, country_code: 'FR', lat: 48.16667, lng: -2.83333, timezone: 'Europe/Paris', kind: 'region' },
    { id: 3410315, name: 'João Lisboa', admin1: 'Maranhão', country_code: 'BR', lat: -5.06, lng: -47.4, timezone: 'America/Fortaleza', kind: 'ville' },
    { id: 4969398, name: 'Lisbon', admin1: 'Maine', country_code: 'US', lat: 44.03, lng: -70.1, timezone: 'America/New_York', kind: 'ville' },
  ],
  // QUOTA_PLEIN=1 : l'envoi de photos est refusé, comme avec l'offre gratuite dépassée
  photo_quota_check: process.env.QUOTA_PLEIN ? "Avec l'offre gratuite, les photos sont possibles dans 2 voyages. Passez premium pour en ajouter à tous vos voyages." : null,
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Access-Control-Expose-Headers', '*')
    if (req.method === 'OPTIONS') return res.end()
    // Liens signés groupés (createSignedUrls) : un lien par chemin, servi ensuite par la règle ci-dessous
    if (req.method === 'POST' && url.pathname.startsWith('/storage/v1/object/sign/')) {
      const bucket = url.pathname.split('/').pop()
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        const { paths = [] } = JSON.parse(raw || '{}')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(paths.map((path) => ({ path, signedURL: `/object/sign/${bucket}/${path}?token=demo`, error: null }))))
      })
      return
    }
    // Stockage : on sert la photo d'après le nom du fichier demandé
    if (url.pathname.startsWith('/storage/v1/object/')) {
      try {
        const file = readFileSync(new URL(url.pathname.split('/').pop(), PHOTOS))
        res.setHeader('Content-Type', 'image/jpeg')
        return res.end(file)
      } catch {
        res.statusCode = 404
        return res.end()
      }
    }
    res.setHeader('Content-Type', 'application/json')
    const single = (req.headers.accept ?? '').includes('vnd.pgrst.object')
    let body = []
    if (url.pathname.startsWith('/auth/v1/user')) body = USER
    else if (url.pathname.startsWith('/rest/v1/rpc/')) body = RPC[url.pathname.split('/').pop()] ?? []
    else if (url.pathname.startsWith('/rest/v1/')) {
      const rows = TABLES[url.pathname.split('/').pop()] ?? []
      body = single ? rows[0] ?? null : rows
    }
    res.end(JSON.stringify(body))
  })
  .listen(54399, () => console.log('faux Supabase sur 54399'))
