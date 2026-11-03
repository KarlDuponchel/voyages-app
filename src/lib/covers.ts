import { countryById } from '../data/countries'
import type { CoverTheme, Destination, Trip } from '../data/types'

/**
 * Photos d'ambiance pour les voyages sans photo de couverture (public/couvertures, crédits dans docs/couvertures.md).
 * Le thème est choisi dans « Modifier le voyage » ; sinon, il est deviné d'après la première étape.
 */
/** `top` : couleur du haut de la photo, pour la barre d'état de l'iPhone au-dessus de l'en-tête d'un voyage */
export const COVER_THEMES: { id: CoverTheme; label: string; top: string }[] = [
  { id: 'ville', label: 'Ville', top: '#b5c4cd' },
  { id: 'plage', label: 'Plage', top: '#9ec0e3' },
  { id: 'montagne', label: 'Montagne', top: '#95d0ef' },
  { id: 'neige', label: 'Neige', top: '#2876a6' },
  { id: 'nature', label: 'Nature', top: '#1e6988' },
  { id: 'campagne', label: 'Campagne', top: '#dce2e0' },
  { id: 'lac', label: 'Lac', top: '#d5d6d8' },
  { id: 'desert', label: 'Désert', top: '#4987a5' },
]

export const asCoverTheme = (v?: string | null): CoverTheme | undefined => COVER_THEMES.find((t) => t.id === v)?.id

/** Adresse de la photo d'ambiance : grand format (en-tête d'un voyage) ou miniature (listes) */
export const coverThemeUrl = (theme: CoverTheme, large = false) => `/couvertures/${theme}${large ? '' : '-mini'}.webp`

// Pays (codes ISO alpha-2) dont l'image la plus évidente n'est pas la ville
const PLAGE = new Set(['MV', 'SC', 'MU', 'BS', 'BB', 'FJ', 'PF', 'CV', 'BZ', 'AG', 'LC', 'KN', 'VC', 'GD', 'TC', 'KY', 'VG', 'VI', 'AW', 'CW', 'MQ', 'GP', 'RE', 'NC', 'WS', 'TO', 'VU', 'PW', 'CK', 'MH', 'KI', 'TV'])
const MONTAGNE = new Set(['IS', 'NO', 'CH', 'AT', 'NP', 'BT', 'NZ', 'KG', 'TJ', 'AD', 'LI', 'FO', 'GE', 'AM', 'SI', 'ME', 'PE', 'BO'])
const NEIGE = new Set(['GL', 'SJ', 'AQ', 'FI'])
const DESERT = new Set(['EG', 'JO', 'AE', 'SA', 'QA', 'OM', 'NA', 'MR', 'ML', 'NE', 'TD', 'DZ', 'LY', 'SD', 'EH', 'BH', 'KW'])

/** Thème deviné d'après la première étape : une île donne la plage, une ville la ville, sinon selon le pays */
export function guessCoverTheme(stop?: Pick<Destination, 'kind' | 'countryId'>): CoverTheme {
  if (!stop) return 'ville'
  const alpha2 = countryById(stop.countryId)?.alpha2 ?? ''
  if (stop.kind === 'ile' || PLAGE.has(alpha2)) return 'plage'
  if (DESERT.has(alpha2)) return 'desert'
  if (stop.kind === 'ville') return 'ville'
  if (NEIGE.has(alpha2)) return 'neige'
  if (MONTAGNE.has(alpha2)) return 'montagne'
  return 'nature'
}

export const coverThemeOf = (trip: Trip): CoverTheme => trip.coverTheme ?? guessCoverTheme(trip.destinations[0])

/** Couleur de la barre d'état au-dessus de la couverture : celle du dégradé avec une photo choisie, sinon le haut de l'ambiance */
export const coverTopColor = (trip: Trip) =>
  trip.coverPhoto ? trip.cover[0] : (COVER_THEMES.find((t) => t.id === coverThemeOf(trip))?.top ?? trip.cover[0])
