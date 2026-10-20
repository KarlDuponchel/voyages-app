import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { daysUntil, formatRange } from '../lib/format'
import './Voyages.css'

function TripRow({ trip }: { trip: Trip }) {
  const d = daysUntil(trip.start)
  const badge = d > 0 ? `J-${d}` : daysUntil(trip.end) >= 0 ? 'En cours' : null
  return (
    <Link to={`/voyages/${trip.id}`} className="trip-row card">
      <span className="trip-row__cover">
        <Cover colors={trip.cover} />
      </span>
      <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <span className="overline muted">{trip.country}</span>
        <span className="title-m">{trip.city}</span>
        <span className="caption muted">
          {formatRange(trip.start, trip.end)} · {trip.bookings.length} réservation{trip.bookings.length > 1 ? 's' : ''}
        </span>
      </span>
      {badge && <span className="pill trip-row__badge">{badge}</span>}
    </Link>
  )
}

export function Voyages() {
  const { trips } = useTrips()
  const sorted = [...trips].sort((a, b) => b.start.localeCompare(a.start))
  const upcoming = sorted.filter((t) => daysUntil(t.end) >= 0).reverse()
  const past = sorted.filter((t) => daysUntil(t.end) < 0)

  return (
    <main className="screen">
      <header className="px stack" style={{ gap: 4 }}>
        <span className="overline muted">
          {trips.length} voyages
        </span>
        <h1 className="display-xl">Voyages</h1>
      </header>
      {upcoming.length > 0 && (
        <section className="px stack" style={{ gap: 10 }}>
          <h2 className="overline muted">À venir</h2>
          {upcoming.map((t) => (
            <TripRow key={t.id} trip={t} />
          ))}
        </section>
      )}
      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Passés</h2>
        {past.map((t) => (
          <TripRow key={t.id} trip={t} />
        ))}
      </section>
    </main>
  )
}
