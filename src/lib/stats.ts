import { geoDistance } from 'd3-geo'
import { continentTotals, visitedCities, visitedCountries, WORLD_COUNTRIES, type Continent } from '../data/countries'
import type { Trip } from '../data/types'
import { nightsBetween, parseLocal } from './format'

const EARTH_RADIUS_KM = 6371
const EARTH_CIRCUMFERENCE_KM = 40_075
/** Point de départ des voyages, pour estimer les distances */
const HOME = { name: 'Paris', lat: 48.86, lng: 2.35 }

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  geoDistance([a.lng, a.lat], [b.lng, b.lat]) * EARTH_RADIUS_KM

export function computeStats(trips: Trip[], now = new Date()) {
  const past = trips.filter((t) => parseLocal(t.end) < now)
  const continents = (Object.keys(continentTotals) as Continent[])
    .filter((c) => continentTotals[c] > 0)
    .map((name) => {
      const visited = visitedCountries.filter((v) => v.continent === name).length
      return { name, visited, total: continentTotals[name], percent: (visited / continentTotals[name]) * 100 }
    })

  // Aller-retour depuis la maison pour chaque voyage terminé
  const km = past.reduce((sum, t) => sum + 2 * distanceKm(HOME, t), 0)
  const farthest = past.reduce<Trip | null>((best, t) => (!best || distanceKm(HOME, t) > distanceKm(HOME, best) ? t : best), null)

  return {
    countries: visitedCountries.length,
    worldPercent: (visitedCountries.length / WORLD_COUNTRIES) * 100,
    continentsVisited: continents.filter((c) => c.visited > 0).length,
    continentsTotal: 7,
    continents,
    cities: visitedCities.length,
    km: Math.round(km),
    earthTurns: km / EARTH_CIRCUMFERENCE_KM,
    flights: past.filter((t) => t.transport === 'avion').length * 2,
    nights: past.reduce((sum, t) => sum + nightsBetween(t.start, t.end), 0),
    trips: past.length,
    photos: trips.reduce((sum, t) => sum + t.photos, 0),
    farthest: farthest ? { name: farthest.city, km: Math.round(distanceKm(HOME, farthest)) } : null,
  }
}
