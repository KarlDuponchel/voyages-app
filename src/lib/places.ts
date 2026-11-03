import { countryByAlpha2 } from '../data/countries'
import type { PlaceKind } from '../data/types'
import { supabase } from './supabase'

/** Une ville, un pays, une île ou une région trouvé par la recherche */
export type Place = {
  name: string
  /** Région et pays, pour distinguer les homonymes ; « Pays », « Île, Espagne », « Région, Italie » sinon */
  detail: string
  /** Pays, île ou région entière (road trip) : un pays a la position et le fuseau de sa capitale */
  kind: PlaceKind
  countryId: string
  lat: number
  lng: number
  timezone?: string
}

const KINDS: PlaceKind[] = ['ville', 'pays', 'ile', 'region']
const KIND_LABEL: Record<PlaceKind, string> = { ville: '', pays: 'Pays', ile: 'Île', region: 'Région' }

/**
 * Recherche de villes, pays, îles et régions dans notre propre base (fonction search_places, données GeoNames) :
 * nom en français, région, pays, coordonnées et fuseau. Rien n'est envoyé à un service tiers.
 */
export async function searchPlaces(query: string, signal?: AbortSignal, citiesOnly = false): Promise<Place[]> {
  let request = supabase.rpc('search_places', { p_query: query, p_limit: 6 })
  if (signal) request = request.abortSignal(signal)
  const { data, error } = await request
  // Recherche remplacée par une plus récente (frappe suivante) : ce n'est pas une panne
  if (signal?.aborted) throw new DOMException('Recherche annulée', 'AbortError')
  if (error) throw error
  return (data ?? []).flatMap((r) => {
    const country = countryByAlpha2(r.country_code)
    const kind = KINDS.find((k) => k === r.kind) ?? 'ville'
    if (!country || (citiesOnly && kind !== 'ville')) return []
    const detail =
      kind === 'ville'
        ? [r.admin1 && r.admin1 !== r.name ? r.admin1 : undefined, country.name].filter(Boolean).join(', ')
        : kind === 'pays'
          ? KIND_LABEL.pays
          : `${KIND_LABEL[kind]}, ${country.name}`
    return [
      {
        // Un pays porte le nom utilisé partout dans l'app (globe, statistiques)
        name: kind === 'pays' ? country.name : r.name,
        detail,
        kind,
        countryId: country.id,
        lat: r.lat,
        lng: r.lng,
        timezone: r.timezone ?? undefined,
      },
    ]
  })
}
