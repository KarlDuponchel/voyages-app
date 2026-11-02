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
}
const RPC = {
  public_trending_places: [],
  public_photos: [],
  public_places: [],
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
