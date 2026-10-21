import { CONTINENTS, ISO_COUNTRIES, type Continent } from './isoCountries'

export type { Continent }

export type Country = { id: string; alpha2: string; name: string; continent: Continent }

const names = new Intl.DisplayNames(['fr'], { type: 'region' })

/** Tous les pays, triés par nom français. `id` = code ISO numérique (celui de la carte world-atlas). */
export const allCountries: Country[] = ISO_COUNTRIES.map(([id, alpha2, c]) => ({
  id,
  alpha2,
  name: names.of(alpha2) ?? alpha2,
  continent: CONTINENTS[c],
})).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const byId = new Map(allCountries.map((c) => [c.id, c]))
const byAlpha2 = new Map(allCountries.map((c) => [c.alpha2, c]))

export const countryById = (id: string) => byId.get(id)
export const countryByAlpha2 = (alpha2: string) => byAlpha2.get(alpha2.toUpperCase())
export const countryName = (id: string) => byId.get(id)?.name ?? ''

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
