import { CalendarDays, ChevronLeft, Plus, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BookingCard } from '../components/BookingCard'
import { Cover } from '../components/Cover'
import { useTrips } from '../data/store'
import type { Booking } from '../data/types'
import { formatDayHeader, formatNumber, formatRange, nightsBetween } from '../lib/format'
import { canEdit, tripCountries } from '../lib/trip'
import { AddBookingSheet } from './AddBookingSheet'
import { ShareTripSheet } from './ShareTripSheet'
import './Voyage.css'

const tabs = ['Itinéraire', 'Billets', 'Budget', 'Photos'] as const
type Tab = (typeof tabs)[number]

function groupByDay(bookings: Booking[]) {
  const days = new Map<string, Booking[]>()
  for (const b of bookings) {
    const day = b.start.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), b])
  }
  return [...days.entries()]
}

export function Voyage() {
  const { tripId } = useParams()
  const { trips, status } = useTrips()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Itinéraire')
  const [adding, setAdding] = useState(false)
  const [sharing, setSharing] = useState(false)
  const trip = trips.find((t) => t.id === tripId)
  if (!trip) return status === 'chargement' ? null : <Navigate to="/voyages" replace />
  const editable = canEdit(trip)
  const money = (n: number) => `${formatNumber(n)} ${trip.currency === 'EUR' ? '€' : trip.currency}`

  const nights = nightsBetween(trip.start, trip.end)
  const firstDay = trip.start
  const dayNumber = (day: string) => nightsBetween(firstDay, day) + 1
  const shown = tab === 'Billets' ? trip.bookings.filter((b) => b.ticket || b.reference) : trip.bookings

  return (
    <main className={`screen voyage ${editable ? 'screen--fab' : ''}`} style={{ paddingTop: 0 }}>
      <section className="voyage__hero">
        <Cover colors={trip.cover} skyline fadeTo="var(--bg-base)" />
        <div className="voyage__nav">
          <button className="icon-btn icon-btn--glass" onClick={() => navigate(-1)} aria-label="Retour">
            <ChevronLeft size={20} />
          </button>
          <button className="icon-btn icon-btn--glass" onClick={() => setSharing(true)} aria-label="Voyageurs et invitations">
            <Users size={20} />
          </button>
        </div>
        <div className="voyage__title px">
          <span className="overline voyage__country">
            {tripCountries(trip)} · {nights + 1} jours
          </span>
          <h1 className="display-xl">{trip.title}</h1>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="pill voyage__chip">
              <CalendarDays size={14} /> {formatRange(trip.start, trip.end)}
            </span>
            {trip.budget != null && (
              <span className="pill voyage__chip">
                <Wallet size={14} /> {money(trip.budget)}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="px">
        <div className="segmented" role="tablist">
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {(tab === 'Itinéraire' || tab === 'Billets') && (
        <section className="px stack fade-in" style={{ gap: 10 }} key={tab}>
          {shown.length === 0 && (
            <p className="card voyage__empty">
              <span className="strong">Rien pour l'instant.</span>
              <span className="caption muted">
                {editable ? 'Ajoutez un billet, un hôtel ou une activité avec le bouton « Ajouter ».' : 'Les réservations ajoutées par les participants apparaîtront ici.'}
              </span>
            </p>
          )}
          {groupByDay(shown).map(([day, items]) => (
            <div key={day} className="stack" style={{ gap: 10 }}>
              <h2 className="voyage__day overline muted">
                <i aria-hidden />
                {formatDayHeader(day)} · Jour {dayNumber(day)}
              </h2>
              {items.map((b) => (
                <BookingCard key={b.id} booking={b} href={`/voyages/${trip.id}/reservations/${b.id}`} />
              ))}
            </div>
          ))}
        </section>
      )}

      {tab === 'Budget' && (
        <section className="px fade-in">
          <div className="card voyage__empty">
            <span className="numeric-l">{trip.budget != null ? money(trip.budget) : '—'}</span>
            <span className="caption muted">Budget prévu. Le suivi des dépenses partagées (qui a payé quoi) arrive dans une prochaine version.</span>
          </div>
        </section>
      )}

      {tab === 'Photos' && (
        <section className="px fade-in">
          <div className="card voyage__empty">
            <span className="strong">{trip.photos > 0 ? `${trip.photos} photos` : 'Pas encore de photos'}</span>
            <span className="caption muted">L'import des photos et vidéos arrive dans une prochaine version.</span>
          </div>
        </section>
      )}

      {editable && (
        <button className="fab btn btn--accent" onClick={() => setAdding(true)}>
          <Plus size={20} /> Ajouter
        </button>
      )}
      <AddBookingSheet trip={trip} open={adding} onClose={() => setAdding(false)} />
      <ShareTripSheet trip={trip} open={sharing} onClose={() => setSharing(false)} />
    </main>
  )
}
