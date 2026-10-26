import { Bell, BellOff, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import { errorMessage } from '../lib/supabase'

/**
 * Activer ou couper les notifications sur cet appareil.
 * `compact` : seulement l'invitation à activer (écran « E-mails à valider »), rien une fois actives.
 */
export function NotificationsSwitch({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    pushState().then(setState)
  }, [])

  const run = async (action: () => Promise<PushState>) => {
    setBusy(true)
    setError(null)
    try {
      setState(await action())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (state === null || state === 'non-configure') return null
  if (compact && state !== 'inactif') return null

  return (
    <div className="stack" style={{ gap: 8 }}>
      {state === 'actif' && (
        <>
          <p className="caption" style={{ margin: 0 }}>
            <Check size={14} style={{ verticalAlign: -2, color: 'var(--accent-lagoon)' }} /> Notifications activées sur cet appareil : vous êtes prévenu
            quand un e-mail transféré a été analysé.
          </p>
          <button
            className="btn btn--ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await disablePush()
                return 'inactif'
              })
            }
          >
            <BellOff size={16} /> Couper les notifications
          </button>
        </>
      )}
      {state === 'inactif' && (
        <>
          <p className="caption muted" style={{ margin: 0 }}>
            Soyez prévenu dès qu'un e-mail transféré a été analysé : une notification vous amène directement aux réservations à valider.
          </p>
          <button className="btn btn--accent" disabled={busy} onClick={() => run(enablePush)}>
            <Bell size={16} /> {busy ? 'Un instant…' : 'Activer les notifications'}
          </button>
        </>
      )}
      {state === 'installer-d-abord' && (
        <p className="caption muted" style={{ margin: 0 }}>
          Sur iPhone, les notifications ne marchent que dans l'app installée sur l'écran d'accueil (voir « Installer l'app » ci-dessous).
        </p>
      )}
      {state === 'refuse' && (
        <p className="caption muted" style={{ margin: 0 }}>
          Les notifications sont bloquées pour Voyages. Pour les autoriser : Réglages du téléphone → Notifications → Voyages.
        </p>
      )}
      {state === 'non-pris-en-charge' && (
        <p className="caption muted" style={{ margin: 0 }}>
          Ce navigateur ne permet pas les notifications.
        </p>
      )}
      {error && (
        <p className="caption form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
