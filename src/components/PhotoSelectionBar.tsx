import { Globe, GlobeLock, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Trip } from '../data/types'
import { deletePhoto, type TripPhoto } from '../lib/photos'
import { publishPhoto, unpublishPhoto } from '../lib/sharing'
import { errorMessage } from '../lib/supabase'

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/**
 * Barre des photos sélectionnées (appui long dans la grille) : rendre publiques, retirer du public ou supprimer d'un coup.
 * Mêmes droits que dans la visionneuse : on publie ses propres photos ; on retire du public et on supprime les siennes,
 * ou toutes si on est propriétaire.
 * Les envois se font un par un ; à la première erreur (30 publications par jour, réseau…), on s'arrête et on dit où on en est.
 */
export function PhotoSelectionBar({
  trip,
  me,
  selected,
  onClear,
  onDone,
}: {
  trip: Trip
  me?: string
  selected: TripPhoto[]
  onClear: () => void
  /** Après une action : recharger la grille et le voyage (nombre de photos, couverture) */
  onDone: () => Promise<void>
}) {
  const [mode, setMode] = useState<'actions' | 'supprimer' | 'publier' | 'retirer'>('actions')
  const stops = [...trip.destinations].sort((a, b) => a.position - b.position)
  const [destination, setDestination] = useState(stops[0]?.id)
  const [rights, setRights] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletable = selected.filter((p) => p.uploadedBy === me || trip.role === 'owner')
  const publishable = selected.filter((p) => p.uploadedBy === me && !p.share)
  const unpublishable = selected.filter((p) => p.share && (p.uploadedBy === me || trip.role === 'owner'))

  /** Applique `action` à chaque élément ; s'arrête à la première erreur */
  const each = async (items: TripPhoto[], action: (p: TripPhoto) => Promise<void>, done: string) => {
    setBusy(true)
    setError(null)
    let count = 0
    try {
      for (const p of items) {
        await action(p)
        count++
      }
      await onDone()
      onClear()
    } catch (e) {
      setError(count > 0 ? `${plural(count, done)} sur ${items.length}. ${errorMessage(e)}` : errorMessage(e))
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  const n = selected.length
  return (
    <div className="card photos-select" role="region" aria-label="Photos sélectionnées">
      <div className="row between">
        <span className="strong">{n === 0 ? 'Touchez les photos à sélectionner' : `${plural(n, 'élément')} sélectionné${n > 1 ? 's' : ''}`}</span>
        <button className="icon-btn" onClick={onClear} disabled={busy} aria-label="Annuler la sélection">
          <X size={18} />
        </button>
      </div>

      {mode === 'actions' && (
        <>
          <div className="row photos-select__actions">
            <button className="btn btn--ghost photos-select__action" disabled={busy || publishable.length === 0} onClick={() => setMode('publier')}>
              <Globe size={16} /> Rendre publiques{publishable.length > 0 && publishable.length !== n ? ` (${publishable.length})` : ''}
            </button>
            {unpublishable.length > 0 && (
              <button className="btn btn--ghost photos-select__action" disabled={busy} onClick={() => setMode('retirer')}>
                <GlobeLock size={16} /> Retirer du public{unpublishable.length !== n ? ` (${unpublishable.length})` : ''}
              </button>
            )}
            <button className="btn btn--ghost photos-select__action" disabled={busy || deletable.length === 0} onClick={() => setMode('supprimer')}>
              <Trash2 size={16} /> Supprimer{deletable.length > 0 && deletable.length !== n ? ` (${deletable.length})` : ''}
            </button>
          </div>
          {n > 0 && publishable.length < n && unpublishable.length < n && (
            <span className="caption muted">
              {publishable.length === 0 ? 'Aucune à publier : ' : 'Seules '}
              vos photos pas encore publiques peuvent être rendues publiques.
            </span>
          )}
        </>
      )}

      {mode === 'retirer' && (
        <>
          <span className="caption">
            {plural(unpublishable.length, 'élément')} ne {unpublishable.length > 1 ? 'seront' : 'sera'} plus visible{unpublishable.length > 1 ? 's' : ''} dans
            Explorer. Les réactions reçues sont effacées ; les photos restent dans le voyage.
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--accent" style={{ flex: 1 }} disabled={busy} onClick={() => each(unpublishable, (p) => unpublishPhoto(p.id), 'retiré')}>
              <GlobeLock size={16} /> {busy ? 'Retrait…' : 'Oui, retirer du public'}
            </button>
            <button className="btn btn--ghost" disabled={busy} onClick={() => setMode('actions')}>
              Annuler
            </button>
          </div>
        </>
      )}

      {mode === 'supprimer' && (
        <>
          <span className="caption">
            {plural(deletable.length, 'élément')} effacé{deletable.length > 1 ? 's' : ''} pour tous les voyageurs, et retiré{deletable.length > 1 ? 's' : ''} du public.
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--accent" style={{ flex: 1 }} disabled={busy} onClick={() => each(deletable, deletePhoto, 'supprimé')}>
              <Trash2 size={16} /> {busy ? 'Suppression…' : 'Oui, supprimer'}
            </button>
            <button className="btn btn--ghost" disabled={busy} onClick={() => setMode('actions')}>
              Annuler
            </button>
          </div>
        </>
      )}

      {mode === 'publier' &&
        (stops.length === 0 ? (
          <span className="caption">Ajoutez d’abord une ville au voyage : une photo publique est rattachée à une ville.</span>
        ) : (
          <>
            <span className="caption">
              Visibles par tous les utilisateurs de l’app, avec votre prénom, la ville et le mois. Jamais le voyage ni ses voyageurs.
            </span>
            {stops.length > 1 && (
              <div className="photos-select__cities" role="radiogroup" aria-label="Ville">
                {stops.map((d) => (
                  <button key={d.id} role="radio" aria-checked={destination === d.id} className={destination === d.id ? 'is-active' : ''} onClick={() => setDestination(d.id)}>
                    {d.city}
                  </button>
                ))}
              </div>
            )}
            <label className="caption photos-select__rights">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
              J’ai pris ces photos, et les personnes reconnaissables sont d’accord pour qu’elles soient publiques.
            </label>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--accent"
                style={{ flex: 1 }}
                disabled={busy || !rights || !destination}
                onClick={() => destination && each(publishable, (p) => publishPhoto(p.id, destination), 'publié')}
              >
                <Globe size={16} /> {busy ? 'Publication…' : `Publier ${plural(publishable.length, 'élément')}`}
              </button>
              <button className="btn btn--ghost" disabled={busy} onClick={() => setMode('actions')}>
                Annuler
              </button>
            </div>
          </>
        ))}

      {error && (
        <span className="caption form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
