export type BookingKind = 'vol' | 'train' | 'car' | 'hotel' | 'activite'

/** Données d'un billet (vol, train, car) pour l'affichage façon carte d'embarquement. */
export type Ticket = {
  carrier: string
  number: string
  from: string
  fromCity: string
  to: string
  toCity: string
  departure: string // HH:MM
  arrival: string // HH:MM
  duration?: string
  passenger?: string
  seat?: string
  gate?: string
  boarding?: string
  cabin?: string
}

export type Booking = {
  id: string
  kind: BookingKind
  title: string
  detail: string
  /** Date et heure locales, format ISO sans fuseau : 2026-11-03T07:15 */
  start: string
  end?: string
  reference?: string
  provider?: string
  source: 'email' | 'pdf' | 'manuel'
  importedAt?: string
  ticket?: Ticket
}

export type Trip = {
  id: string
  city: string
  country: string
  /** Code ISO 3166 numérique du pays (identifiant utilisé par la carte du monde) */
  countryId: string
  lat: number
  lng: number
  start: string // AAAA-MM-JJ
  end: string
  budget?: number
  transport: 'avion' | 'train' | 'voiture'
  /** Trois couleurs du dégradé de couverture, du haut vers le bas */
  cover: [string, string, string]
  photos: number
  bookings: Booking[]
}
