import { MapPin, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { countryName } from '../data/countries'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import type { Place } from '../lib/places'
import { errorMessage } from '../lib/supabase'
import { canEdit } from '../lib/trip'
import { PlaceSearch } from './PlaceSearch'
import './TripStops.css'

/** Villes du voyage, dans l'ordre. Les participants peuvent en ajouter ou en retirer. */
export function TripStops({ trip }: { trip: Trip }) {
  const { addDestination, removeDestination } = useTrips()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editable = canEdit(trip)
  // Le pays n'est répété que s'il change d'une étape à l'autre
  const multiCountry = new Set(trip.destinations.map((d) => d.countryId)).size > 1

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const add = (place: Place | null) => {
    if (!place) return
    setAdding(false)
    run(() => addDestination(trip.id, place))
  }

  return (
    <div className="card stops">
      <div className="row between">
        <h2 className="overline muted" style={{ margin: 0 }}>
          {trip.destinations.length > 1 ? `${trip.destinations.length} étapes` : 'Étape'}
        </h2>
        {editable && !adding && (
          <button className="stops__add caption" onClick={() => setAdding(true)} disabled={busy}>
            <Plus size={14} /> Ajouter une ville
          </button>
        )}
      </div>

      <ol className="stops__list">
        {trip.destinations.map((d) => (
          <li key={d.id}>
            <MapPin size={14} aria-hidden />
            <span className="strong">{d.city}</span>
            {multiCountry && <span className="caption muted">{countryName(d.countryId)}</span>}
            {editable && trip.destinations.length > 1 && (
              <button
                className="stops__remove"
                onClick={() => run(() => removeDestination(d.id))}
                disabled={busy}
                aria-label={`Retirer ${d.city}`}
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ol>

      {adding && (
        <div className="stack" style={{ gap: 8 }}>
          <PlaceSearch label="Nouvelle étape" value={null} onChange={add} placeholder="Louxor, Assouan…" />
          <button className="btn btn--ghost" onClick={() => setAdding(false)}>
            Annuler
          </button>
        </div>
      )}
      {error && (
        <p className="caption form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
