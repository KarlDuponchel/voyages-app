import { Check } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { Transport, Trip } from '../data/types'
import { errorMessage } from '../lib/supabase'
import { transports } from './NewTripSheet'

/** Titre, dates, transport et budget d'un voyage. Les étapes se gèrent dans l'onglet Itinéraire. */
export function EditTripSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { updateTrip } = useTrips()
  const [start, setStart] = useState(trip.start)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setError(null)
    onClose()
  }

  // À chaque ouverture, on repart de la date enregistrée
  useEffect(() => {
    if (open) setStart(trip.start)
  }, [open, trip.start])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const budgetText = String(f.get('budget') || '').replace(',', '.').trim()
    const budget = budgetText ? Number(budgetText) : null
    if (budget !== null && !(budget >= 0)) {
      setError('Le budget doit être un nombre.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateTrip(trip.id, {
        title: String(f.get('title')).trim(),
        start: String(f.get('start')),
        end: String(f.get('end')),
        transport: f.get('transport') as Transport,
        budget,
      })
      close()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} label="Modifier le voyage">
      <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
        <h2 className="display-l">Modifier le voyage</h2>
        <label className="field">
          <span className="overline muted">Nom du voyage</span>
          <input className="input" name="title" required maxLength={120} defaultValue={trip.title} />
        </label>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Départ</span>
            <input className="input" name="start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Retour</span>
            <input className="input" name="end" type="date" required min={start} defaultValue={trip.end} />
          </label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Transport</span>
            <select className="input" name="transport" defaultValue={trip.transport}>
              {transports.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Budget (€)</span>
            <input className="input" name="budget" inputMode="decimal" placeholder="Facultatif" defaultValue={trip.budget ?? ''} />
          </label>
        </div>
        {error && (
          <p className="caption form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          <Check size={16} /> {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Sheet>
  )
}
