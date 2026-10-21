import { useMemo } from 'react'
import { useAuth } from '../data/auth'
import { useTrips } from '../data/store'
import { computeStats, homeOf } from './stats'

export function useStats() {
  const { trips, visitedCountryIds } = useTrips()
  const { profile } = useAuth()
  const home = homeOf(profile)
  const homeKey = home ? `${home.lat},${home.lng}` : ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeStats(trips, visitedCountryIds, home), [trips, visitedCountryIds, homeKey])
}
