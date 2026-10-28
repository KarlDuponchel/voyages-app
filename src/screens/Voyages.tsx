import { ChevronRight, Mail, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TripCover } from '../components/TripCover'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { daysUntil, formatRange } from '../lib/format'
import { tripCountries } from '../lib/trip'
import { NewTripSheet } from './NewTripSheet'
import './Imports.css'
import './Voyages.css'

function TripRow({ trip }: { trip: Trip }) {
  const d = daysUntil(trip.start)
  const badge = d > 0 ? `J-${d}` : daysUntil(trip.end) >= 0 ? 'En cours' : null
  const others = trip.members.length - 1
  return (
    <Link to={`/voyages/${trip.id}`} className="trip-row card">
      <span className="trip-row__cover">
        <TripCover trip={trip} />
      </span>
      <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <span className="overline muted">{tripCountries(trip)}</span>
        <span className="title-m">{trip.title}</span>
        <span className="caption muted">
          {formatRange(trip.start, trip.end)} · {trip.bookings.length} réservation{trip.bookings.length > 1 ? 's' : ''}
          {others > 0 && ` · à ${others + 1}`}
        </span>
      </span>
      {badge && <span className="pill trip-row__badge">{badge}</span>}
    </Link>
  )
}

const statusText = { 'hors-ligne': 'Hors ligne : dernière version enregistrée', erreur: 'Synchronisation impossible pour le moment' } as const

export function Voyages() {
  const { trips, status, imports } = useTrips()
  const toValidate = imports.filter((i) => i.status !== 'erreur').length
  const [creating, setCreating] = useState(false)
  const sorted = [...trips].sort((a, b) => b.start.localeCompare(a.start))
  const upcoming = sorted.filter((t) => daysUntil(t.end) >= 0).reverse()
  const past = sorted.filter((t) => daysUntil(t.end) < 0)

  return (
    <main className="screen">
      <header className="row between px">
        <div className="stack" style={{ gap: 4 }}>
          <span className="overline muted">
            {trips.length} voyage{trips.length > 1 ? 's' : ''}
          </span>
          <h1 className="display-xl">Voyages</h1>
        </div>
        <button className="icon-btn icon-btn--accent" onClick={() => setCreating(true)} aria-label="Nouveau voyage">
          <Plus size={20} />
        </button>
      </header>

      {imports.length > 0 && (
        <section className="px">
          <Link to="/imports" className="imports-banner">
            <Mail size={20} />
            <span className="stack" style={{ gap: 0, flex: 1 }}>
              <span className="strong">
                {toValidate > 0 ? `${toValidate} e-mail${toValidate > 1 ? 's' : ''} à valider` : 'E-mails transférés'}
              </span>
              <span className="caption muted">Réservations lues par l'IA, à vérifier avant de les ajouter</span>
            </span>
            <ChevronRight size={18} className="muted" aria-hidden />
          </Link>
        </section>
      )}

      {(status === 'hors-ligne' || status === 'erreur') && (
        <p className="px caption muted" style={{ margin: 0 }} role="status">
          {statusText[status]}
        </p>
      )}

      {trips.length === 0 && status !== 'chargement' && (
        <section className="px">
          <div className="card stack" style={{ gap: 10, padding: 20 }}>
            <span className="title-m">Votre premier voyage</span>
            <span className="caption muted">
              Créez un voyage, ajoutez-y vos billets et réservations, puis invitez ceux qui partent avec vous.
            </span>
            <button className="btn btn--accent" onClick={() => setCreating(true)}>
              <Plus size={16} /> Nouveau voyage
            </button>
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="px stack" style={{ gap: 10 }}>
          <h2 className="overline muted">À venir</h2>
          {upcoming.map((t) => (
            <TripRow key={t.id} trip={t} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="px stack" style={{ gap: 10 }}>
          <h2 className="overline muted">Passés</h2>
          {past.map((t) => (
            <TripRow key={t.id} trip={t} />
          ))}
        </section>
      )}

      <NewTripSheet open={creating} onClose={() => setCreating(false)} />
    </main>
  )
}
