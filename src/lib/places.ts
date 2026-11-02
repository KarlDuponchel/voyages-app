import { countryByAlpha2 } from '../data/countries'
import { supabase } from './supabase'

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

/**
 * Recherche de villes dans notre propre base (fonction search_places, données GeoNames) :
 * nom en français, région, pays, coordonnées et fuseau. Rien n'est envoyé à un service tiers.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  let request = supabase.rpc('search_places', { p_query: query, p_limit: 6 })
  if (signal) request = request.abortSignal(signal)
  const { data, error } = await request
  // Recherche remplacée par une plus récente (frappe suivante) : ce n'est pas une panne
  if (signal?.aborted) throw new DOMException('Recherche annulée', 'AbortError')
  if (error) throw error
  return (data ?? []).flatMap((r) => {
    const country = countryByAlpha2(r.country_code)
    if (!country) return []
    return [
      {
        name: r.name,
        detail: [r.admin1 && r.admin1 !== r.name ? r.admin1 : undefined, country.name].filter(Boolean).join(', '),
        countryId: country.id,
        lat: r.lat,
        lng: r.lng,
        timezone: r.timezone ?? undefined,
      },
    ]
  })
}
