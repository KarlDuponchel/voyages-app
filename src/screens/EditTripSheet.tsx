import { Check, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { Transport, Trip } from '../data/types'
import { errorMessage } from '../lib/supabase'
import { transports } from './NewTripSheet'

/**
 * Titre, dates, transport et budget d'un voyage (les étapes se gèrent dans l'onglet Itinéraire).
 * Le propriétaire peut aussi supprimer le voyage, avec ses réservations et leurs fichiers.
 */
/**
 * Ce que la suppression efface, en français correct :
 * « Ses 3 réservations et 2 fichiers joints seront effacés définitivement, pour les 2 voyageurs. »
 */
function deletionSummary(bookings: number, files: number, members: number): string {
  const forAll = members > 1 ? `, pour les ${members} voyageurs` : ''
  if (bookings === 0) return `Le voyage sera effacé définitivement${forAll}.`
  const what = bookings === 1 ? 'Sa réservation' : `Ses ${bookings} réservations`
  const withFiles = files === 0 ? '' : files === 1 ? ' et son fichier joint' : ` et ${files} fichiers joints`
  const verb = bookings === 1 && files === 0 ? 'sera effacée' : files === 0 ? 'seront effacées' : 'seront effacés'
  return `${what}${withFiles} ${verb} définitivement${forAll}.`
}

export function EditTripSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { updateTrip, deleteTrip } = useTrips()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileCount = trip.bookings.reduce((n, b) => n + b.files.length, 0)
  const [start, setStart] = useState(trip.start)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setError(null)
    setConfirmDelete(false)
    onClose()
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteTrip(trip.id)
      close()
      navigate('/voyages', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
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

        {trip.role === 'owner' &&
          (confirmDelete ? (
            <div className="card stack edit-trip__danger" style={{ gap: 10 }}>
              <span className="strong">Supprimer « {trip.title} » ?</span>
              <span className="caption muted">{deletionSummary(trip.bookings.length, fileCount, trip.members.length)}</span>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn--accent" style={{ flex: 1 }} onClick={remove} disabled={busy}>
                  <Trash2 size={16} /> Oui, supprimer
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Supprimer le voyage
            </button>
          ))}
      </form>
    </Sheet>
  )
}
