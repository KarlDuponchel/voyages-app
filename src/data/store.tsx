import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { sampleTrips } from './sampleTrips'
import type { Booking, Trip } from './types'

/**
 * Stockage local (sur le téléphone) des voyages.
 * Une base partagée (Supabase) pourra remplacer ce fichier pour synchroniser vos deux téléphones.
 */
const STORAGE_KEY = 'voyages:trips:v1'

function load(): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Trip[]
  } catch {
    // données illisibles ou stockage bloqué : on repart des exemples
  }
  return sampleTrips
}

type TripsContextValue = {
  trips: Trip[]
  addBooking: (tripId: string, booking: Omit<Booking, 'id'>) => void
  resetSample: () => void
}

const TripsContext = createContext<TripsContextValue | null>(null)

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
    } catch {
      // stockage plein ou bloqué : les données restent en mémoire pour la session
    }
  }, [trips])

  const addBooking: TripsContextValue['addBooking'] = (tripId, booking) => {
    const withId: Booking = { ...booking, id: crypto.randomUUID() }
    setTrips((all) =>
      all.map((t) =>
        t.id === tripId ? { ...t, bookings: [...t.bookings, withId].sort((a, b) => a.start.localeCompare(b.start)) } : t,
      ),
    )
  }

  return (
    <TripsContext.Provider value={{ trips, addBooking, resetSample: () => setTrips(sampleTrips) }}>
      {children}
    </TripsContext.Provider>
  )
}

export function useTrips() {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips doit être utilisé dans <TripsProvider>')
  return ctx
}
