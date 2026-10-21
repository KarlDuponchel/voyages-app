import { Check } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Booking, BookingKind, Trip } from '../data/types'
import { errorMessage } from '../lib/supabase'
import { bookingKinds } from './BookingCard'

export type BookingInput = Pick<Booking, 'kind' | 'title' | 'detail' | 'start' | 'end' | 'reference'>

/** Formulaire d'une réservation, partagé entre l'ajout et la modification. */
export function BookingForm({
  trip,
  initial,
  submitLabel,
  onSubmit,
  children,
}: {
  trip: Trip
  initial?: Booking
  submitLabel: string
  onSubmit: (input: BookingInput) => Promise<void>
  /** Boutons ou informations affichés sous le bouton principal */
  children?: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(initial?.start.slice(0, 10) ?? trip.start)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const text = (name: string) => String(f.get(name) ?? '').trim()
    const start = `${text('date')}T${text('time') || '00:00'}`
    const end = text('endDate') ? `${text('endDate')}T${text('endTime') || '00:00'}` : undefined
    if (end && end < start) {
      setError('La fin doit être après le début.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        kind: f.get('kind') as BookingKind,
        title: text('title'),
        detail: text('detail'),
        start,
        end,
        reference: text('reference') || undefined,
      })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form className="stack add-form" style={{ gap: 12 }} onSubmit={submit}>
      <fieldset className="add-form__kinds">
        <legend className="overline muted">Type</legend>
        {(Object.keys(bookingKinds) as BookingKind[]).map((k) => {
          const { label, Icon, color } = bookingKinds[k]
          return (
            <label key={k} style={{ color }}>
              <input type="radio" name="kind" value={k} defaultChecked={k === (initial?.kind ?? 'vol')} />
              <Icon size={18} />
              <span>{label}</span>
            </label>
          )
        })}
      </fieldset>
      <label className="field">
        <span className="overline muted">Titre</span>
        <input className="input" name="title" required maxLength={200} defaultValue={initial?.title} placeholder="Paris → Lisbonne, Hôtel Memmo…" />
      </label>
      <label className="field">
        <span className="overline muted">Détail</span>
        <input className="input" name="detail" defaultValue={initial?.detail} placeholder="Compagnie, n° de vol, nombre de nuits…" />
      </label>
      <div className="row" style={{ gap: 10 }}>
        <label className="field" style={{ flex: 1.4 }}>
          <span className="overline muted">Début</span>
          <input className="input" name="date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span className="overline muted">Heure</span>
          <input className="input" name="time" type="time" defaultValue={initial ? initial.start.slice(11, 16) : '10:00'} />
        </label>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <label className="field" style={{ flex: 1.4 }}>
          <span className="overline muted">Fin (facultatif)</span>
          <input className="input" name="endDate" type="date" min={startDate} defaultValue={initial?.end?.slice(0, 10)} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span className="overline muted">Heure</span>
          <input className="input" name="endTime" type="time" defaultValue={initial?.end?.slice(11, 16)} />
        </label>
      </div>
      <label className="field">
        <span className="overline muted">Référence</span>
        <input className="input" name="reference" defaultValue={initial?.reference} placeholder="Facultatif" />
      </label>
      {error && (
        <p className="caption form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={busy}>
        <Check size={16} /> {busy ? 'Enregistrement…' : submitLabel}
      </button>
      {children}
    </form>
  )
}
