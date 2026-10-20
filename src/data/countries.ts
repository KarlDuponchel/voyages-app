/**
 * Pays visités, par code ISO 3166 numérique (celui de la carte world-atlas).
 * Pour ajouter un pays : son code se trouve sur https://fr.wikipedia.org/wiki/ISO_3166-1 (colonne « numérique »).
 */
export type Continent = 'Europe' | 'Afrique' | 'Amérique du Nord' | 'Amérique du Sud' | 'Asie' | 'Océanie' | 'Antarctique'

export const visitedCountries: { id: string; name: string; continent: Continent }[] = [
  { id: '250', name: 'France', continent: 'Europe' },
  { id: '620', name: 'Portugal', continent: 'Europe' },
  { id: '724', name: 'Espagne', continent: 'Europe' },
  { id: '380', name: 'Italie', continent: 'Europe' },
  { id: '056', name: 'Belgique', continent: 'Europe' },
  { id: '756', name: 'Suisse', continent: 'Europe' },
  { id: '276', name: 'Allemagne', continent: 'Europe' },
  { id: '826', name: 'Royaume-Uni', continent: 'Europe' },
  { id: '528', name: 'Pays-Bas', continent: 'Europe' },
  { id: '372', name: 'Irlande', continent: 'Europe' },
  { id: '352', name: 'Islande', continent: 'Europe' },
  { id: '300', name: 'Grèce', continent: 'Europe' },
  { id: '191', name: 'Croatie', continent: 'Europe' },
  { id: '040', name: 'Autriche', continent: 'Europe' },
  { id: '578', name: 'Norvège', continent: 'Europe' },
  { id: '504', name: 'Maroc', continent: 'Afrique' },
  { id: '818', name: 'Égypte', continent: 'Afrique' },
  { id: '788', name: 'Tunisie', continent: 'Afrique' },
  { id: '840', name: 'États-Unis', continent: 'Amérique du Nord' },
  { id: '124', name: 'Canada', continent: 'Amérique du Nord' },
  { id: '484', name: 'Mexique', continent: 'Amérique du Nord' },
  { id: '392', name: 'Japon', continent: 'Asie' },
  { id: '764', name: 'Thaïlande', continent: 'Asie' },
]

/** Nombre de pays reconnus par continent (total : 195). */
export const continentTotals: Record<Continent, number> = {
  Europe: 44,
  Afrique: 54,
  'Amérique du Nord': 23,
  'Amérique du Sud': 12,
  Asie: 48,
  Océanie: 14,
  Antarctique: 0,
}

export const WORLD_COUNTRIES = 195

/** Villes visitées, affichées comme repères sur le globe. */
export const visitedCities: { name: string; lat: number; lng: number }[] = [
  { name: 'Paris', lat: 48.86, lng: 2.35 },
  { name: 'Lisbonne', lat: 38.72, lng: -9.14 },
  { name: 'Rome', lat: 41.9, lng: 12.5 },
  { name: 'Reykjavik', lat: 64.15, lng: -21.94 },
  { name: 'Marrakech', lat: 31.63, lng: -8.01 },
  { name: 'New York', lat: 40.71, lng: -74.0 },
  { name: 'Montréal', lat: 45.5, lng: -73.57 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Bangkok', lat: 13.75, lng: 100.5 },
  { name: 'Athènes', lat: 37.98, lng: 23.73 },
  { name: 'Barcelone', lat: 41.39, lng: 2.17 },
]
