import { Link2, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { useAuth } from '../data/auth'
import { useTrips } from '../data/store'
import type { Trip, TripRole } from '../data/types'
import { formatRange } from '../lib/format'
import { errorMessage } from '../lib/supabase'
import { canEdit } from '../lib/trip'
import './ShareTripSheet.css'

const roleLabel: Record<TripRole, string> = { owner: 'Propriétaire', editor: 'Participant', viewer: 'Lecteur' }

/** Membres du voyage, invitation par lien, départ ou suppression du voyage. */
export function ShareTripSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { createInvitation, leaveTrip } = useTrips()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [link, setLink] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const me = session?.user.id

  const close = () => {
    setLink(null)
    setConfirmLeave(false)
    setError(null)
    onClose()
  }

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

  const invite = () =>
    run(async () => {
      const url = await createInvitation(trip.id, role)
      setLink(url)
      const text = `Rejoins le voyage « ${trip.title} » (${formatRange(trip.start, trip.end)}) sur Voyages`
      try {
        if (navigator.share) await navigator.share({ title: trip.title, text, url })
        else await navigator.clipboard.writeText(url)
      } catch {
        // partage annulé : le lien reste affiché ci-dessous
      }
    })

  const leave = () =>
    run(async () => {
      await leaveTrip(trip.id)
      close()
      navigate('/voyages', { replace: true })
    })

  return (
    <Sheet open={open} onClose={close} label="Partager le voyage">
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="display-l">Voyageurs</h2>
        <p className="caption muted" style={{ margin: 0 }}>
          Seules ces personnes voient {trip.title}, ses billets et ses réservations.
        </p>
      </div>

      <ul className="members card">
        {trip.members.map((m) => (
          <li key={m.userId}>
            <span className="members__avatar" aria-hidden>
              {m.name.charAt(0).toUpperCase()}
            </span>
            <span className="strong" style={{ flex: 1 }}>
              {m.name}
              {m.userId === me && <span className="muted"> (vous)</span>}
            </span>
            <span className="caption muted">{roleLabel[m.role]}</span>
          </li>
        ))}
      </ul>

      {canEdit(trip) && (
        <div className="stack" style={{ gap: 10 }}>
          <h3 className="overline muted" style={{ margin: 0 }}>
            Inviter quelqu'un
          </h3>
          <div className="segmented" role="radiogroup" aria-label="Droits de la personne invitée">
            {(['editor', 'viewer'] as const).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? 'is-active' : ''} onClick={() => setRole(r)}>
                {r === 'editor' ? 'Peut modifier' : 'Peut seulement voir'}
              </button>
            ))}
          </div>
          <button className="btn btn--accent" onClick={invite} disabled={busy}>
            <Link2 size={16} /> Envoyer un lien d'invitation
          </button>
          {link && (
            <p className="caption share-link">
              <span className="muted">Lien valable 14 jours, pour une seule personne :</span>
              <span className="share-link__url">{link}</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="caption form-error" role="alert">
          {error}
        </p>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {confirmLeave ? (
          <>
            <p className="caption" style={{ margin: 0 }}>
              Vous ne verrez plus ce voyage. Il faudra une nouvelle invitation pour le retrouver.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--accent" style={{ flex: 1 }} onClick={leave} disabled={busy}>
                Oui, quitter
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirmLeave(false)}>
                Annuler
              </button>
            </div>
          </>
        ) : (
          trip.members.length > 1 && (
            <button className="btn btn--ghost" onClick={() => setConfirmLeave(true)}>
              <LogOut size={16} /> Quitter le voyage
            </button>
          )
        )}
        {/* La suppression du voyage se fait depuis « Modifier le voyage » (crayon) */}
      </div>
    </Sheet>
  )
}
