import { ChevronRight, Mail, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, NavLink, useParams } from 'react-router-dom'
import { TripCover } from '../components/TripCover'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { daysUntil, formatRange } from '../lib/format'
import { preloadPhoto } from '../lib/photos'
import { tripCountries } from '../lib/trip'
import { NewTripSheet } from './NewTripSheet'
import { Voyage } from './Voyage'
import { Voyages } from './Voyages'
import './Imports.css'
import './VoyagesBureau.css'

function TripItem({ trip }: { trip: Trip }) {
  const d = daysUntil(trip.start)
  const badge = d > 0 ? `J-${d}` : daysUntil(trip.end) >= 0 ? 'En cours' : null
  const names = trip.members.map((m) => m.name).filter(Boolean)
  return (
    <NavLink
      to={`/voyages/${trip.id}`}
      className={({ isActive }) => `bureau-trip${isActive ? ' is-active' : ''}`}
      // La grande couverture se prépare au survol : elle est prête au clic
      onPointerEnter={() => preloadPhoto(trip.coverPhoto?.path)}
      onFocus={() => preloadPhoto(trip.coverPhoto?.path)}
    >
      <span className="bureau-trip__cover">
        <TripCover trip={trip} />
      </span>
      <span className="stack" style={{ gap: 1, minWidth: 0, flex: 1 }}>
        <span className="bureau-trip__title">{trip.title}</span>
        <span className="caption muted">{formatRange(trip.start, trip.end)}</span>
        <span className="caption muted bureau-trip__meta">
          {tripCountries(trip)}
          {names.length > 1 && ` · ${names.join(' & ')}`}
        </span>
      </span>
      {badge && <span className="pill bureau-trip__badge">{badge}</span>}
    </NavLink>
  )
}

/**
 * Voyages sur ordinateur : la liste à gauche, le voyage ouvert à droite (maquette Figma Make).
 * Sans voyage choisi, ouvre le prochain (ou le dernier) ; sans aucun voyage, l'écran Voyages habituel.
 */
export function VoyagesBureau() {
  const { tripId } = useParams()
  const { trips, status, imports } = useTrips()
  const [creating, setCreating] = useState(false)
  const toValidate = imports.filter((i) => i.status !== 'erreur').length
  const sorted = [...trips].sort((a, b) => b.start.localeCompare(a.start))
  const upcoming = sorted.filter((t) => daysUntil(t.end) >= 0).reverse()
  const past = sorted.filter((t) => daysUntil(t.end) < 0)

  if (!tripId) {
    if (trips.length === 0) return status === 'chargement' ? null : <Voyages />
    return <Navigate to={`/voyages/${(upcoming[0] ?? past[0]).id}`} replace />
  }

  return (
    <main className="screen voyages-bureau">
      <header className="row between px">
        <div className="stack" style={{ gap: 4 }}>
          <span className="overline overline--accent">Préparez, partez, revivez</span>
          <h1 className="display-xl">Vos voyages</h1>
        </div>
        <button className="btn btn--accent" onClick={() => setCreating(true)}>
          <Plus size={18} /> Nouveau voyage
        </button>
      </header>

      <div className="voyages-bureau__body px">
        <aside className="voyages-bureau__list card" aria-label="Vos voyages">
          {imports.length > 0 && (
            <Link to="/imports" className="imports-banner">
              <Mail size={18} />
              <span className="strong" style={{ flex: 1 }}>
                {toValidate > 0 ? `${toValidate} e-mail${toValidate > 1 ? 's' : ''} à valider` : 'E-mails transférés'}
              </span>
              <ChevronRight size={16} className="muted" aria-hidden />
            </Link>
          )}
          {upcoming.length > 0 && (
            <section className="stack" style={{ gap: 4 }}>
              <h2 className="overline muted voyages-bureau__heading">
                À venir <span>{upcoming.length}</span>
              </h2>
              {upcoming.map((t) => (
                <TripItem key={t.id} trip={t} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="stack" style={{ gap: 4 }}>
              <h2 className="overline muted voyages-bureau__heading">
                Passés <span>{past.length}</span>
              </h2>
              {past.map((t) => (
                <TripItem key={t.id} trip={t} />
              ))}
            </section>
          )}
        </aside>

        <div className="voyages-bureau__trip">
          {/* key : changer de voyage repart d'un écran vierge (onglet Itinéraire, panneaux fermés) */}
          <Voyage key={tripId} embedded />
        </div>
      </div>

      <NewTripSheet open={creating} onClose={() => setCreating(false)} />
    </main>
  )
}
