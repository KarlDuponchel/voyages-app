import { geoDistance } from 'd3-geo'
import { continentTotals, countryById, WORLD_COUNTRIES, type Continent } from '../data/countries'
import type { Trip } from '../data/types'
import { nightsBetween, parseLocal } from './format'

const EARTH_RADIUS_KM = 6371
const EARTH_CIRCUMFERENCE_KM = 40_075

type Point = { lat: number; lng: number }

const distanceKm = (a: Point, b: Point) => geoDistance([a.lng, a.lat], [b.lng, b.lat]) * EARTH_RADIUS_KM

/** Distance d'un voyage terminé : maison → étapes dans l'ordre → maison */
function tripKm(trip: Trip, home: Point | null) {
  const points = home ? [home, ...trip.destinations, home] : trip.destinations
  let km = 0
  for (let i = 1; i < points.length; i++) km += distanceKm(points[i - 1], points[i])
  return km
}

/** Villes des voyages terminés (une seule fois chacune), pour les repères du globe */
export function visitedCities(trips: Trip[], now = new Date()) {
  const cities = new Map<string, { name: string; lat: number; lng: number }>()
  for (const t of trips)
    if (parseLocal(t.end) < now)
      for (const d of t.destinations) cities.set(`${d.city}|${d.countryId}`, { name: d.city, lat: d.lat, lng: d.lng })
  return [...cities.values()]
}

/**
 * @param visitedCountryIds pays visités (saisis à la main + voyages terminés), calculés par Supabase
 * @param home ville de départ du profil ; sans elle, les distances ne comptent que les trajets entre étapes
 */
export function computeStats(trips: Trip[], visitedCountryIds: string[], home: Point | null, now = new Date()) {
  const past = trips.filter((t) => parseLocal(t.end) < now)
  const visited = visitedCountryIds.map(countryById).filter((c) => c !== undefined)

  const continents = (Object.keys(continentTotals) as Continent[])
    .filter((c) => continentTotals[c] > 0)
    .map((name) => {
      const count = visited.filter((v) => v.continent === name).length
      return { name, visited: count, total: continentTotals[name], percent: Math.min(100, (count / continentTotals[name]) * 100) }
    })

  const km = past.reduce((sum, t) => sum + tripKm(t, home), 0)
  const farthest = home
    ? past
        .flatMap((t) => t.destinations)
        .reduce<{ name: string; km: number } | null>((best, d) => {
          const dist = distanceKm(home, d)
          return !best || dist > best.km ? { name: d.city, km: dist } : best
        }, null)
    : null

  return {
    countries: visited.length,
    worldPercent: Math.min(100, (visited.length / WORLD_COUNTRIES) * 100),
    continentsVisited: continents.filter((c) => c.visited > 0).length,
    continentsTotal: 7,
    continents,
    cities: visitedCities(trips, now).length,
    km: Math.round(km),
    earthTurns: km / EARTH_CIRCUMFERENCE_KM,
    flights: past.filter((t) => t.transport === 'avion').length * 2,
    nights: past.reduce((sum, t) => sum + nightsBetween(t.start, t.end), 0),
    trips: past.length,
    photos: trips.reduce((sum, t) => sum + t.photos, 0),
    farthest: farthest ? { name: farthest.name, km: Math.round(farthest.km) } : null,
    hasHome: home !== null,
  }
}

export function homeOf(profile: { homeLat?: number; homeLng?: number } | null): Point | null {
  return profile?.homeLat != null && profile.homeLng != null ? { lat: profile.homeLat, lng: profile.homeLng } : null
}
