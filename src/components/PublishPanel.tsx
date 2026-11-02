import { Globe } from 'lucide-react'
import { useState } from 'react'
import type { Trip } from '../data/types'
import type { TripPhoto } from '../lib/photos'
import { publishPhoto } from '../lib/sharing'
import { errorMessage } from '../lib/supabase'

/** Rendre publique (ou changer la ville et la légende d'une photo déjà publique) */
export function PublishPanel({ trip, photo, onDone, onCancel }: { trip: Trip; photo: TripPhoto; onDone: () => Promise<void>; onCancel: () => void }) {
  const stops = [...trip.destinations].sort((a, b) => a.position - b.position)
  const [destination, setDestination] = useState(photo.share?.destinationId ?? stops[0]?.id)
  const [caption, setCaption] = useState(photo.share?.caption ?? '')
  const [rights, setRights] = useState(!!photo.share)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (stops.length === 0)
    return (
      <div className="stack publish" style={{ gap: 10 }}>
        <span className="caption">Ajoutez d’abord une ville au voyage : une photo publique est rattachée à une ville.</span>
        <button className="btn btn--ghost viewer-photo__action" onClick={onCancel}>
          Fermer
        </button>
      </div>
    )

  const submit = async () => {
    if (!destination) return
    setBusy(true)
    setError(null)
    try {
      await publishPhoto(photo.id, destination, caption)
      await onDone()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="stack publish" style={{ gap: 10 }}>
      <span className="caption">
        Visible par tous les utilisateurs de l’app, avec votre prénom, la ville et le mois. Jamais le voyage ni ses voyageurs.
      </span>
      {stops.length > 1 && (
        <div className="publish__cities" role="radiogroup" aria-label="Ville">
          {stops.map((d) => (
            <button key={d.id} role="radio" aria-checked={destination === d.id} className={destination === d.id ? 'is-active' : ''} onClick={() => setDestination(d.id)}>
              {d.city}
            </button>
          ))}
        </div>
      )}
      <input
        className="input publish__caption"
        placeholder="Légende publique (facultatif)"
        maxLength={300}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <label className="caption publish__rights">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
        J’ai pris cette photo, et les personnes reconnaissables sont d’accord pour qu’elle soit publique.
      </label>
      {error && <span className="caption form-error">{error}</span>}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn--accent" style={{ flex: 1 }} disabled={busy || !rights || !destination} onClick={submit}>
          <Globe size={16} /> {photo.share ? 'Enregistrer' : `Publier${stops.length === 1 ? ` à ${stops[0].city}` : ''}`}
        </button>
        <button className="btn btn--ghost viewer-photo__action" onClick={onCancel} disabled={busy}>
          Annuler
        </button>
      </div>
    </div>
  )
}
