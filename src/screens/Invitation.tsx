import { Check, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTrips } from '../data/store'
import type { TripRole } from '../data/types'
import { formatRange } from '../lib/format'
import { errorMessage, supabase } from '../lib/supabase'
import './Connexion.css'

type Preview = {
  trip_title: string
  start_date: string
  end_date: string
  invited_by_name: string | null
  role: TripRole
  status: 'valide' | 'utilisee' | 'expiree' | 'revoquee'
}

const roleLabel: Record<TripRole, string> = {
  owner: 'propriétaire',
  editor: 'participant : vous pourrez ajouter des réservations',
  viewer: 'lecteur : vous pourrez suivre le voyage',
}

const statusLabel: Record<Exclude<Preview['status'], 'valide'>, string> = {
  utilisee: 'Cette invitation a déjà été utilisée.',
  expiree: 'Cette invitation a expiré. Demandez un nouveau lien.',
  revoquee: 'Cette invitation a été annulée.',
}

/** Écran ouvert par un lien d'invitation (/invitation/:token), une fois connecté. */
export function Invitation() {
  const { token = '' } = useParams()
  const { acceptInvitation } = useTrips()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('invitation_preview', { p_token: token }).then(({ data, error }) => {
      if (error) setError(errorMessage(error))
      setPreview(((data as Preview[] | null) ?? [])[0] ?? null)
    })
  }, [token])

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      const tripId = await acceptInvitation(token)
      navigate(`/voyages/${tripId}`, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <main className="connexion">
      <Link to="/voyages" className="icon-btn" aria-label="Retour">
        <ChevronLeft size={20} />
      </Link>
      {preview === undefined && !error && <p className="muted">Chargement de l'invitation…</p>}
      {preview === null && !error && <p className="muted">Ce lien d'invitation n'existe pas. Vérifiez qu'il est complet.</p>}
      {preview && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="overline muted">{preview.invited_by_name ?? 'Quelqu’un'} vous invite</span>
          <h1 className="display-xl">{preview.trip_title}</h1>
          <span className="muted">{formatRange(preview.start_date, preview.end_date)}</span>
          {preview.status === 'valide' ? (
            <p className="caption muted">Vous rejoindrez ce voyage en tant que {roleLabel[preview.role]}.</p>
          ) : (
            <p className="caption form-error">{statusLabel[preview.status]}</p>
          )}
        </div>
      )}
      {error && (
        <p className="caption form-error" role="alert">
          {error}
        </p>
      )}
      {preview?.status === 'valide' && (
        <button className="btn btn--accent" onClick={accept} disabled={busy}>
          <Check size={16} /> {busy ? 'Un instant…' : 'Rejoindre le voyage'}
        </button>
      )}
    </main>
  )
}
