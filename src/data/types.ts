export type BookingKind = 'vol' | 'train' | 'car' | 'bateau' | 'location' | 'hotel' | 'activite' | 'autre'
export type TripRole = 'owner' | 'editor' | 'viewer'
export type Transport = 'avion' | 'train' | 'voiture' | 'bateau' | 'autre'

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
  /** Date et heure locales du lieu, format ISO sans fuseau : 2026-11-03T07:15 */
  start: string
  end?: string
  /** Fuseau IANA du lieu, ex. Europe/Lisbon */
  timezone?: string
  reference?: string
  provider?: string
  source: 'email' | 'pdf' | 'manuel'
  importedAt?: string
  ticket?: Ticket
  /** PDF et captures joints (billet, confirmation…) */
  files: BookingFile[]
}

export type BookingFile = {
  id: string
  /** Chemin dans le bucket « trip-files » : {trip_id}/{booking_id}/… */
  path: string
  name: string
  mimeType?: string
  size?: number
}

/** Une étape du voyage (ville) */
export type Destination = {
  id: string
  /** Ordre dans le voyage */
  position: number
  city: string
  /** Code ISO 3166 numérique du pays (identifiant utilisé par la carte du monde) */
  countryId: string
  lat: number
  lng: number
  timezone?: string
}

export type Member = {
  userId: string
  name: string
  role: TripRole
}

export type Trip = {
  id: string
  title: string
  /** Étapes, dans l'ordre ; la première sert de lieu principal */
  destinations: Destination[]
  start: string // AAAA-MM-JJ
  end: string
  budget?: number
  currency: string
  transport: Transport
  /** Trois couleurs du dégradé de couverture, du haut vers le bas */
  cover: [string, string, string]
  photos: number
  bookings: Booking[]
  members: Member[]
  /** Rôle de l'utilisateur connecté dans ce voyage */
  role: TripRole
}

export type Profile = {
  id: string
  displayName: string
  homeCity?: string
  homeLat?: number
  homeLng?: number
}

/** Réservation proposée par l'IA (billet ou e-mail lu), à valider avant d'être enregistrée */
export type BookingDraft = {
  kind: BookingKind
  title: string
  detail: string
  start: string
  end?: string
  reference?: string
  provider?: string
  /** Ville principale, pour retrouver le voyage */
  place?: string
  ticket?: Ticket
}

/** Pièce jointe d'un e-mail transféré (bucket « imports ») */
export type ImportFile = { path: string; name: string; mimeType: string; size: number }

/** E-mail transféré à l'adresse d'import, en attente de validation */
export type PendingImport = {
  id: string
  receivedAt: string
  subject?: string
  status: 'en_cours' | 'a_valider' | 'erreur'
  error?: string
  drafts: BookingDraft[]
  files: ImportFile[]
  suggestedTripId?: string
}
