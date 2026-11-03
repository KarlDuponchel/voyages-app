import { countryByAlpha2 } from '../data/countries'
import { supabase } from './supabase'

/** Une ville ou un pays trouvé par la recherche */
export type Place = {
  name: string
  /** Région et pays, pour distinguer les homonymes ; « Pays » pour un pays */
  detail: string
  /** Un pays entier (road trip) : position et fuseau de sa capitale */
  isCountry: boolean
  countryId: string
  lat: number
  lng: number
  timezone?: string
}

/**
 * Recherche de villes et de pays dans notre propre base (fonction search_places, données GeoNames) :
 * nom en français, région, pays, coordonnées et fuseau. Rien n'est envoyé à un service tiers.
 */
export async function searchPlaces(query: string, signal?: AbortSignal, withCountries = true): Promise<Place[]> {
  let request = supabase.rpc('search_places', { p_query: query, p_limit: 6 })
  if (signal) request = request.abortSignal(signal)
  const { data, error } = await request
  // Recherche remplacée par une plus récente (frappe suivante) : ce n'est pas une panne
  if (signal?.aborted) throw new DOMException('Recherche annulée', 'AbortError')
  if (error) throw error
  return (data ?? []).flatMap((r) => {
    const country = countryByAlpha2(r.country_code)
    const isCountry = r.kind === 'pays'
    if (!country || (isCountry && !withCountries)) return []
    return [
      {
        // Un pays porte le nom utilisé partout dans l'app (globe, statistiques)
        name: isCountry ? country.name : r.name,
        detail: isCountry ? 'Pays' : [r.admin1 && r.admin1 !== r.name ? r.admin1 : undefined, country.name].filter(Boolean).join(', '),
        isCountry,
        countryId: country.id,
        lat: r.lat,
        lng: r.lng,
        timezone: r.timezone ?? undefined,
      },
    ]
  })
}
