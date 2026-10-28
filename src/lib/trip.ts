import { countryName } from '../data/countries'
import type { Trip } from '../data/types'

/** Lieu principal du voyage (première étape) */
export const mainPlace = (trip: Trip) => trip.destinations[0]

/** « Portugal » ou « Portugal · Espagne » */
export function tripCountries(trip: Trip): string {
  return [...new Set(trip.destinations.map((d) => countryName(d.countryId)).filter(Boolean))].join(' · ')
}

/** « Égypte, Égypte » → « Égypte » : le pays n'est ajouté au titre que s'il apporte quelque chose */
export function titleWithCountries(trip: Trip): string {
  const countries = tripCountries(trip)
  return countries && countries.toLowerCase() !== trip.title.toLowerCase() ? `${trip.title}, ${countries}` : trip.title
}

/** « 0 photo », « 1 photo », « 3 photos » */
export const photoCount = (n: number) => `${n} photo${n > 1 ? 's' : ''}`

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

/** Fuseau d'une réservation proposée : celui de l'étape du même nom, sinon celui de la première étape */
export function draftTimezone(trip: Trip, draft?: { place?: string }): string | undefined {
  const place = draft?.place?.toLowerCase()
  const stop = place ? trip.destinations.find((d) => d.city.toLowerCase() === place) : undefined
  return (stop ?? trip.destinations[0])?.timezone
}
