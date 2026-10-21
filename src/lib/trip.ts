import { countryName } from '../data/countries'
import type { Trip } from '../data/types'

/** Lieu principal du voyage (première étape) */
export const mainPlace = (trip: Trip) => trip.destinations[0]

/** « Portugal » ou « Portugal · Espagne » */
export function tripCountries(trip: Trip): string {
  return [...new Set(trip.destinations.map((d) => countryName(d.countryId)).filter(Boolean))].join(' · ')
}

export const canEdit = (trip: Trip) => trip.role === 'owner' || trip.role === 'editor'

/** Dégradés de couverture proposés aux nouveaux voyages */
export const COVERS: [string, string, string][] = [
  ['#2A1B4A', '#C2547A', '#FF9A62'],
  ['#16304A', '#4FD1C5', '#C8F1E4'],
  ['#22184A', '#A78BFA', '#F7A8C4'],
  ['#5A2A3A', '#E0794A', '#F6C46A'],
  ['#0E2A47', '#3A8FB7', '#9FE3DA'],
  ['#4A2318', '#E8875A', '#FFD49A'],
]
export const randomCover = () => COVERS[Math.floor(Math.random() * COVERS.length)]
