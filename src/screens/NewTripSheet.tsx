import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlaceSearch } from '../components/PlaceSearch'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { Transport } from '../data/types'
import type { Place } from '../lib/places'
import { errorMessage } from '../lib/supabase'
import './Connexion.css'

const transports: { value: Transport; label: string }[] = [
  { value: 'avion', label: 'Avion' },
  { value: 'train', label: 'Train' },
  { value: 'voiture', label: 'Voiture' },
  { value: 'bateau', label: 'Bateau' },
  { value: 'autre', label: 'Autre' },
]

export function NewTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createTrip } = useTrips()
  const navigate = useNavigate()
  const [place, setPlace] = useState<Place | null>(null)
  const [start, setStart] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setPlace(null)
    setStart('')
    setError(null)
    onClose()
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!place) {
      setError('Choisissez une destination dans la liste.')
      return
    }
    const f = new FormData(e.currentTarget)
    const budget = Number(String(f.get('budget') || '').replace(',', '.'))
    setBusy(true)
    setError(null)
    try {
      const id = await createTrip({
        title: String(f.get('title') || '').trim() || place.name,
        place,
        start: String(f.get('start')),
        end: String(f.get('end')),
        transport: f.get('transport') as Transport,
        budget: budget > 0 ? budget : undefined,
      })
      close()
      navigate(`/voyages/${id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} label="Nouveau voyage">
      <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
        <h2 className="display-l">Nouveau voyage</h2>
        <PlaceSearch label="Destination" value={place} onChange={setPlace} />
        <label className="field">
          <span className="overline muted">Nom du voyage</span>
          <input className="input" name="title" placeholder={place ? place.name : 'Facultatif : « Road trip en Écosse »'} maxLength={120} />
        </label>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Départ</span>
            <input className="input" name="start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Retour</span>
            <input className="input" name="end" type="date" required min={start || undefined} />
          </label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Transport</span>
            <select className="input" name="transport" defaultValue="avion">
              {transports.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Budget (€)</span>
            <input className="input" name="budget" inputMode="decimal" placeholder="Facultatif" />
          </label>
        </div>
        {error && (
          <p className="caption form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          <Check size={16} /> {busy ? 'Création…' : 'Créer le voyage'}
        </button>
      </form>
    </Sheet>
  )
}
