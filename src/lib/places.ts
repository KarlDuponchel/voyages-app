import { countryByAlpha2 } from '../data/countries'

/** Une ville trouvée par la recherche */
export type Place = {
  name: string
  /** Région et pays, pour distinguer les homonymes */
  detail: string
  countryId: string
  lat: number
  lng: number
  timezone?: string
}

type OpenMeteoResult = {
  name: string
  latitude: number
  longitude: number
  country_code?: string
  country?: string
  admin1?: string
  timezone?: string
}

/**
 * Recherche de villes via le service gratuit Open-Meteo (sans clé ni compte).
 * Seul le texte tapé est envoyé.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=fr&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Recherche indisponible')
  const json = (await res.json()) as { results?: OpenMeteoResult[] }
  return (json.results ?? []).flatMap((r) => {
    const country = r.country_code ? countryByAlpha2(r.country_code) : undefined
    if (!country) return []
    return [
      {
        name: r.name,
        detail: [r.admin1 !== r.name ? r.admin1 : undefined, country.name].filter(Boolean).join(', '),
        countryId: country.id,
        lat: r.latitude,
        lng: r.longitude,
        timezone: r.timezone,
      },
    ]
  })
}
