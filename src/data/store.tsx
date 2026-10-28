import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Place } from '../lib/places'
import { supabase } from '../lib/supabase'
import { randomCover } from '../lib/trip'
import type { TablesUpdate } from './database.types'
import { deleteBookingFile, prefetchFiles, removeStoredFiles, uploadBookingFile } from '../lib/files'
import { removeTripPhotos } from '../lib/photos'
import type { Booking, BookingDraft, BookingFile, ImportFile, PendingImport, Ticket, Transport, Trip, TripRole } from './types'

/**
 * Voyages de l'utilisateur connecté, lus dans Supabase.
 * Une copie est gardée sur le téléphone : l'app s'ouvre instantanément et reste consultable hors ligne.
 * Les modifications demandent une connexion.
 */

type Status = 'chargement' | 'a-jour' | 'hors-ligne' | 'erreur'

type Cache = {
  trips: Trip[]
  visitedCountryIds: string[]
  manualCountryIds: string[]
  /** E-mails transférés en attente de validation */
  imports: PendingImport[]
  /** Partie avant « @ » de l'adresse de transfert */
  importAlias: string | null
}
const EMPTY: Cache = { trips: [], visitedCountryIds: [], manualCountryIds: [], imports: [], importAlias: null }
// v3 : les réservations ont une liste de fichiers (l'ancienne copie n'en a pas, on l'ignore)
const cacheKey = (userId: string) => `voyages:cache:v3:${userId}`

function readCache(userId: string): Cache {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Cache) }
  } catch {
    // cache illisible : on attend le serveur
  }
  return EMPTY
}

// ---- Lignes renvoyées par Supabase -------------------------------------------------

type TripRow = {
  id: string
  title: string
  start_date: string
  end_date: string
  transport: Transport
  budget_amount: number | null
  budget_currency: string
  cover_colors: string[] | null
  cover: { id: string; path: string; thumb_path: string } | null
  photo_count: { count: number }[] | null
  trip_destinations: { id: string; position: number; city: string; country_code: string; lat: number; lng: number; timezone: string | null }[]
  bookings: {
    id: string
    kind: Booking['kind']
    title: string
    detail: string
    starts_at: string
    ends_at: string | null
    timezone: string | null
    reference: string | null
    provider: string | null
    source: Booking['source']
    imported_at: string | null
    ticket: Ticket | null
    booking_files: { id: string; storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null; created_at: string }[]
  }[]
  trip_members: { user_id: string; role: TripRole; profiles: { display_name: string } | null }[]
}

const TRIP_SELECT = `
  id, title, start_date, end_date, transport, budget_amount, budget_currency, cover_colors,
  cover:trip_photos!trips_cover_photo_id_fkey ( id, path, thumb_path ),
  photo_count:trip_photos!trip_photos_trip_id_fkey ( count ),
  trip_destinations ( id, position, city, country_code, lat, lng, timezone ),
  bookings ( id, kind, title, detail, starts_at, ends_at, timezone, reference, provider, source, imported_at, ticket,
    booking_files ( id, storage_path, file_name, mime_type, size_bytes, created_at ) ),
  trip_members ( user_id, role, profiles ( display_name ) )
`

/** « 2026-11-03T07:15:00 » → « 2026-11-03T07:15 » */
const minutes = (ts: string) => ts.slice(0, 16)

function toTrip(r: TripRow, userId: string): Trip {
  const cover = r.cover_colors?.length === 3 ? (r.cover_colors as [string, string, string]) : randomCover()
  return {
    id: r.id,
    title: r.title,
    start: r.start_date,
    end: r.end_date,
    transport: r.transport,
    budget: r.budget_amount ?? undefined,
    currency: r.budget_currency,
    cover,
    coverPhoto: r.cover ? { id: r.cover.id, path: r.cover.path, thumbPath: r.cover.thumb_path } : undefined,
    photos: r.photo_count?.[0]?.count ?? 0,
    destinations: [...r.trip_destinations]
      .sort((a, b) => a.position - b.position)
      .map((d) => ({ id: d.id, position: d.position, city: d.city, countryId: d.country_code, lat: d.lat, lng: d.lng, timezone: d.timezone ?? undefined })),
    bookings: r.bookings
      .map((b) => ({
        id: b.id,
        kind: b.kind,
        title: b.title,
        detail: b.detail,
        start: minutes(b.starts_at),
        end: b.ends_at ? minutes(b.ends_at) : undefined,
        timezone: b.timezone ?? undefined,
        reference: b.reference ?? undefined,
        provider: b.provider ?? undefined,
        source: b.source,
        importedAt: b.imported_at ?? undefined,
        ticket: b.ticket ?? undefined,
        files: [...(b.booking_files ?? [])]
          .sort((x, y) => x.created_at.localeCompare(y.created_at))
          .map((f) => ({ id: f.id, path: f.storage_path, name: f.file_name, mimeType: f.mime_type ?? undefined, size: f.size_bytes ?? undefined })),
      }))
      .sort((a, b) => a.start.localeCompare(b.start)),
    members: r.trip_members.map((m) => ({ userId: m.user_id, role: m.role, name: m.profiles?.display_name ?? 'Membre' })),
    role: r.trip_members.find((m) => m.user_id === userId)?.role ?? 'viewer',
  }
}

// ---- Contexte ----------------------------------------------------------------------

export type NewTrip = {
  title: string
  place: Place
  start: string
  end: string
  transport: Transport
  budget?: number
}

export type TripPatch = Partial<Pick<Trip, 'title' | 'start' | 'end' | 'transport'>> & { budget?: number | null }
export type BookingPatch = Pick<Booking, 'kind' | 'title' | 'detail' | 'start' | 'end' | 'reference'>

type TripsContextValue = Cache & {
  status: Status
  refresh: () => Promise<void>
  createTrip: (trip: NewTrip) => Promise<string>
  deleteTrip: (tripId: string) => Promise<void>
  leaveTrip: (tripId: string) => Promise<void>
  updateTrip: (tripId: string, patch: TripPatch) => Promise<void>
  /** Renvoie l'identifiant de la réservation créée */
  addBooking: (tripId: string, booking: Omit<Booking, 'id' | 'files'>) => Promise<string>
  updateBooking: (bookingId: string, patch: BookingPatch) => Promise<void>
  deleteBooking: (bookingId: string) => Promise<void>
  /** Joint un PDF ou une capture à une réservation */
  attachFile: (tripId: string, bookingId: string, file: File) => Promise<void>
  removeFile: (file: BookingFile) => Promise<void>
  /** Crée un lien d'invitation et renvoie son adresse */
  createInvitation: (tripId: string, role: Exclude<TripRole, 'owner'>) => Promise<string>
  acceptInvitation: (token: string) => Promise<string>
  addCountry: (countryId: string) => Promise<void>
  removeCountry: (countryId: string) => Promise<void>
  /** Nouvelle adresse de transfert (l'ancienne cesse de fonctionner) */
  regenerateImportAlias: () => Promise<void>
  /** Joint à une réservation les pièces jointes de l'e-mail dont elle vient */
  attachImportFiles: (imp: PendingImport, tripId: string, bookingId: string) => Promise<void>
  /** Supprime l'e-mail (traité ou ignoré) et ses pièces jointes */
  dismissImport: (imp: PendingImport) => Promise<void>
  addDestination: (tripId: string, place: Place) => Promise<void>
  removeDestination: (destinationId: string) => Promise<void>
  /** Déplace une étape d'un cran vers le haut (-1) ou le bas (+1) */
  moveDestination: (tripId: string, destinationId: string, direction: -1 | 1) => Promise<void>
}

const TripsContext = createContext<TripsContextValue | null>(null)

/**
 * Import par e-mail : lu à part et sans bloquer le reste (si la migration de l'import
 * n'est pas encore appliquée, l'app fonctionne sans).
 */
async function loadImports(): Promise<Pick<Cache, 'imports' | 'importAlias'>> {
  const [rows, address] = await Promise.all([
    supabase.from('pending_imports').select('id, received_at, subject, status, error, drafts, files, suggested_trip_id').order('received_at', { ascending: false }),
    supabase.from('import_addresses').select('alias').maybeSingle(),
  ])
  return {
    imports: (rows.data ?? []).map((r) => ({
      id: r.id,
      receivedAt: r.received_at,
      subject: r.subject ?? undefined,
      status: r.status as PendingImport['status'],
      error: r.error ?? undefined,
      drafts: (Array.isArray(r.drafts) ? r.drafts : []) as unknown as BookingDraft[],
      files: (Array.isArray(r.files) ? r.files : []) as unknown as ImportFile[],
      suggestedTripId: r.suggested_trip_id ?? undefined,
    })),
    importAlias: address.data?.alias ?? null,
  }
}

/** Pièce jointe d'un e-mail → fichier à joindre à la réservation */
async function importFileAsFile(f: ImportFile): Promise<File> {
  const { data, error } = await supabase.storage.from('imports').download(f.path)
  if (error || !data) throw error ?? new Error('Pièce jointe introuvable')
  return new File([data], f.name, { type: f.mimeType })
}

const must = <T,>({ data, error }: { data: T; error: unknown }): T => {
  if (error) throw error
  return data
}

export function TripsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, setData] = useState<Cache>(() => readCache(userId))
  const [status, setStatus] = useState<Status>('chargement')
  const loading = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    // Une seule lecture à la fois ; si une lecture est en cours, on en relance une après elle
    // pour être sûr de voir la modification qui vient d'être faite.
    if (loading.current) await loading.current.catch(() => {})
    loading.current ??= (async () => {
      try {
        const [trips, visited, manual] = await Promise.all([
          supabase.from('trips').select(TRIP_SELECT).order('start_date'),
          supabase.from('my_visited_countries').select('country_code'),
          supabase.from('user_countries').select('country_code'),
        ])
        const next: Cache = {
          trips: ((must(trips) ?? []) as unknown as TripRow[]).map((r) => toTrip(r, userId)),
          visitedCountryIds: (must(visited) ?? []).map((c) => c.country_code as string),
          manualCountryIds: (must(manual) ?? []).map((c) => c.country_code as string),
          ...(await loadImports()),
        }
        setData(next)
        setStatus('a-jour')
        try {
          localStorage.setItem(cacheKey(userId), JSON.stringify(next))
        } catch {
          // stockage plein ou bloqué : les données restent en mémoire
        }
        // Billets des voyages à venir ou en cours : copiés sur le téléphone pour les avoir sans réseau
        const today = new Date().toLocaleDateString('sv-SE') // AAAA-MM-JJ, date locale
        prefetchFiles(next.trips.filter((t) => t.end >= today).flatMap((t) => t.bookings.flatMap((b) => b.files)))
      } catch {
        setStatus(navigator.onLine ? 'erreur' : 'hors-ligne')
      } finally {
        loading.current = null
      }
    })()
    await loading.current
  }, [userId])

  useEffect(() => {
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', refresh)
    }
  }, [refresh])

  const value: TripsContextValue = {
    ...data,
    status,
    refresh,

    createTrip: async ({ title, place, start, end, transport, budget }) => {
      const trip = must(
        await supabase
          .from('trips')
          .insert({ title, start_date: start, end_date: end, transport, budget_amount: budget ?? null, cover_colors: randomCover() })
          .select('id')
          .single(),
      ) as { id: string }
      must(
        await supabase.from('trip_destinations').insert({
          trip_id: trip.id,
          position: 0,
          city: place.name,
          country_code: place.countryId,
          lat: place.lat,
          lng: place.lng,
          timezone: place.timezone ?? null,
        }),
      )
      await refresh()
      return trip.id
    },

    deleteTrip: async (tripId) => {
      // Les lignes partent en cascade avec le voyage, mais pas les fichiers du stockage : on les retire d'abord
      const trip = data.trips.find((t) => t.id === tripId)
      await removeStoredFiles(trip?.bookings.flatMap((b) => b.files.map((f) => f.path)) ?? [])
      await removeTripPhotos(tripId)
      must(await supabase.from('trips').delete().eq('id', tripId))
      await refresh()
    },

    leaveTrip: async (tripId) => {
      must(await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', userId))
      await refresh()
    },

    updateTrip: async (tripId, patch) => {
      const row: TablesUpdate<'trips'> = {}
      if (patch.title !== undefined) row.title = patch.title
      if (patch.start !== undefined) row.start_date = patch.start
      if (patch.end !== undefined) row.end_date = patch.end
      if (patch.transport !== undefined) row.transport = patch.transport
      if (patch.budget !== undefined) row.budget_amount = patch.budget
      must(await supabase.from('trips').update(row).eq('id', tripId))
      await refresh()
    },

    updateBooking: async (bookingId, b) => {
      must(
        await supabase
          .from('bookings')
          .update({
            kind: b.kind,
            title: b.title,
            detail: b.detail,
            starts_at: b.start,
            ends_at: b.end ?? null,
            reference: b.reference ?? null,
          })
          .eq('id', bookingId),
      )
      await refresh()
    },

    deleteBooking: async (bookingId) => {
      const files = data.trips.flatMap((t) => t.bookings).find((b) => b.id === bookingId)?.files ?? []
      await removeStoredFiles(files.map((f) => f.path))
      must(await supabase.from('bookings').delete().eq('id', bookingId))
      await refresh()
    },

    attachFile: async (tripId, bookingId, file) => {
      await uploadBookingFile(tripId, bookingId, file)
      await refresh()
    },

    removeFile: async (file) => {
      await deleteBookingFile(file)
      await refresh()
    },

    addBooking: async (tripId, b) => {
      const trip = data.trips.find((t) => t.id === tripId)
      const created = must(
        await supabase.from('bookings').insert({
          trip_id: tripId,
          kind: b.kind,
          title: b.title,
          detail: b.detail,
          starts_at: b.start,
          ends_at: b.end ?? null,
          timezone: b.timezone ?? trip?.destinations[0]?.timezone ?? null,
          reference: b.reference ?? null,
          provider: b.provider ?? null,
          source: b.source,
          imported_at: b.importedAt ?? null,
          ticket: b.ticket ?? null,
        })
        .select('id')
        .single(),
      ) as { id: string }
      await refresh()
      return created.id
    },

    createInvitation: async (tripId, role) => {
      const inv = must(await supabase.from('trip_invitations').insert({ trip_id: tripId, role }).select('token').single()) as {
        token: string
      }
      return `${window.location.origin}/invitation/${inv.token}`
    },

    acceptInvitation: async (token) => {
      const tripId = must(await supabase.rpc('accept_invitation', { p_token: token })) as string
      await refresh()
      return tripId
    },

    addCountry: async (countryId) => {
      must(await supabase.from('user_countries').upsert({ country_code: countryId }, { onConflict: 'user_id,country_code', ignoreDuplicates: true }))
      await refresh()
    },

    addDestination: async (tripId, place) => {
      const trip = data.trips.find((t) => t.id === tripId)
      must(
        await supabase.from('trip_destinations').insert({
          trip_id: tripId,
          position: Math.max(-1, ...(trip?.destinations.map((d) => d.position) ?? [])) + 1,
          city: place.name,
          country_code: place.countryId,
          lat: place.lat,
          lng: place.lng,
          timezone: place.timezone ?? null,
        }),
      )
      await refresh()
    },

    removeDestination: async (destinationId) => {
      must(await supabase.from('trip_destinations').delete().eq('id', destinationId))
      await refresh()
    },

    moveDestination: async (tripId, destinationId, direction) => {
      const stops = data.trips.find((t) => t.id === tripId)?.destinations ?? []
      const i = stops.findIndex((d) => d.id === destinationId)
      const j = i + direction
      if (i < 0 || j < 0 || j >= stops.length) return
      // On renumérote toutes les étapes (0, 1, 2…) après l'échange : les positions restent propres
      const order = [...stops]
      ;[order[i], order[j]] = [order[j], order[i]]
      for (const [position, d] of order.entries())
        if (d.position !== position) must(await supabase.from('trip_destinations').update({ position }).eq('id', d.id))
      await refresh()
    },

    regenerateImportAlias: async () => {
      must(await supabase.rpc('regenerate_import_alias'))
      await refresh()
    },

    attachImportFiles: async (imp, tripId, bookingId) => {
      for (const f of imp.files) await uploadBookingFile(tripId, bookingId, await importFileAsFile(f))
      await refresh()
    },

    dismissImport: async (imp) => {
      if (imp.files.length > 0) {
        const { error } = await supabase.storage.from('imports').remove(imp.files.map((f) => f.path))
        if (error) throw error
      }
      must(await supabase.from('pending_imports').delete().eq('id', imp.id))
      await refresh()
    },

    removeCountry: async (countryId) => {
      must(await supabase.from('user_countries').delete().eq('user_id', userId).eq('country_code', countryId))
      await refresh()
    },
  }

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
}

export function useTrips() {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips doit être utilisé dans <TripsProvider>')
  return ctx
}
