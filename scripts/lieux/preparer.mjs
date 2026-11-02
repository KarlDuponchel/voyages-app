// Prépare les villes de la recherche (tables places et place_names) à partir des fichiers GeoNames.
// Usage : node scripts/lieux/preparer.mjs <dossier GeoNames> <dossier de sortie>
// Le dossier GeoNames contient cities500.txt, admin1CodesASCII.txt, countryInfo.txt et alternateNamesV2.txt (voir docs/lieux.md).
// Sortie : des fichiers SQL numérotés, à exécuter dans l'ordre (scripts/lieux/importer.mjs).
import { createReadStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const [SOURCE, OUT] = process.argv.slice(2)
if (!SOURCE || !OUT) throw new Error('Usage : node scripts/lieux/preparer.mjs <dossier GeoNames> <dossier de sortie>')

/** Lieux à écarter : quartiers, lieux détruits, abandonnés, historiques */
const EXCLUS = new Set(['PPLX', 'PPLW', 'PPLQ', 'PPLH', 'PPLCH'])
const PAR_FICHIER = 4000

const lignes = (fichier) => readFileSync(join(SOURCE, fichier), 'utf8').split('\n')

// Régions : « FR.84 » → nom et identifiant GeoNames (pour chercher son nom français)
const regions = new Map()
for (const line of lignes('admin1CodesASCII.txt')) {
  const [code, name, , id] = line.split('\t')
  if (code && id) regions.set(code, { name, id: Number(id) })
}

// Langue principale de chaque pays (« PT » → « pt ») : pour chercher aussi « Lisboa », « München »
const langues = new Map()
for (const line of lignes('countryInfo.txt')) {
  if (line.startsWith('#')) continue
  const c = line.split('\t')
  const langue = (c[15] ?? '').split(',')[0].split('-')[0]
  if (c[0] && langue) langues.set(c[0], langue)
}

// Lieux habités
const lieux = []
for (const line of lignes('cities500.txt')) {
  const c = line.split('\t')
  if (c.length < 18 || EXCLUS.has(c[7])) continue
  lieux.push({
    id: Number(c[0]),
    name: c[1],
    ascii: c[2],
    lat: Number(c[4]),
    lng: Number(c[5]),
    country: c[8],
    region: regions.get(`${c[8]}.${c[10]}`),
    population: Number(c[14]) || 0,
    timezone: c[17],
  })
}
console.log(`${lieux.length} lieux`)

// Noms français, anglais et dans la langue du pays, des lieux et des régions
// (le préféré, sinon le premier ; ni familier ni historique)
const voulus = new Set([...lieux.map((l) => l.id), ...[...regions.values()].map((r) => r.id)])
const langueLocale = new Map(lieux.map((l) => [l.id, langues.get(l.country)]))
const noms = { fr: new Map(), en: new Map(), local: new Map() }
const prefere = new Set()
const lecture = createInterface({ input: createReadStream(join(SOURCE, 'alternateNamesV2.txt'), 'utf8'), crlfDelay: Infinity })
for await (const line of lecture) {
  const [, geo, lang, name, pref, , colloq, hist] = line.split('\t')
  if (colloq === '1' || hist === '1') continue
  const id = Number(geo)
  if (!voulus.has(id)) continue
  const sorte = lang === 'fr' || lang === 'en' ? lang : lang && lang === langueLocale.get(id) ? 'local' : null
  if (!sorte) continue
  const cle = `${sorte}:${id}`
  if (pref === '1' && !prefere.has(cle)) {
    noms[sorte].set(id, name)
    prefere.add(cle)
  } else if (!noms[sorte].has(id)) noms[sorte].set(id, name)
}
console.log(`${noms.fr.size} noms français, ${noms.en.size} anglais, ${noms.local.size} dans la langue du pays`)

/** Même idée que normalize_place en SQL : sert à écarter les doublons et les noms sans lettres latines */
const normalise = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const sql = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const arrondi = (n) => Math.round(n * 1e5) / 1e5

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, '000-vider.sql'), '-- Rechargement complet : on repart de tables vides\ntruncate public.places cascade;\n')

let fichiers = 0
let lignesNoms = 0
for (let i = 0; i < lieux.length; i += PAR_FICHIER) {
  const lot = lieux.slice(i, i + PAR_FICHIER)
  const places = lot.map((l) => {
    const name = noms.fr.get(l.id) ?? l.name
    const region = l.region ? (noms.fr.get(l.region.id) ?? l.region.name) : null
    return `(${l.id},${sql(name)},${sql(region)},${sql(l.country)},${arrondi(l.lat)},${arrondi(l.lng)},${sql(l.timezone)},${l.population})`
  })
  const names = lot.flatMap((l) => {
    const vus = new Set()
    const valeurs = []
    const ajouter = (n, principal) => {
      const cle = n && normalise(n)
      if (!cle || vus.has(cle)) return
      vus.add(cle)
      valeurs.push(`(${l.id},${sql(n)},${principal})`)
    }
    for (const n of [noms.fr.get(l.id), l.name, l.ascii, noms.en.get(l.id)]) ajouter(n, true)
    ajouter(noms.local.get(l.id), false)
    return valeurs
  })
  lignesNoms += names.length
  fichiers++
  writeFileSync(
    join(OUT, `${String(fichiers).padStart(3, '0')}.sql`),
    `insert into public.places (id, name, admin1, country_code, lat, lng, timezone, population) values\n${places.join(',\n')};\n` +
      `insert into public.place_names (place_id, name, principal) values\n${names.join(',\n')};\n`,
  )
}
console.log(`${fichiers} fichiers SQL, ${lignesNoms} noms cherchables, dans ${OUT}`)
