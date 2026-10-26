import { Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dismissInstall, installPlatform, shouldOfferInstall } from '../lib/install'
import { InstallSteps } from './InstallSteps'
import { Sheet } from './Sheet'
import './InstallSteps.css'

/** Délai avant d'apparaître : on laisse d'abord la page s'afficher */
const DELAY_MS = 1200

/**
 * Message d'accueil à la première ouverture dans le navigateur : installer l'app sur l'écran d'accueil.
 * Une fois par appareil. « Plus tard » (ou fermer le panneau) le repropose dans une semaine,
 * « Ne plus afficher » jamais. Jamais dans l'app installée, ni sur ordinateur.
 *
 * Il apparaît aussi avant la connexion : l'app installée ne partage pas sa session avec le
 * navigateur, mieux vaut donc l'installer d'abord et se connecter directement dedans.
 */
export function InstallPrompt() {
  const [open, setOpen] = useState(false)
  const platform = installPlatform()

  useEffect(() => {
    if (!shouldOfferInstall()) return
    const timer = setTimeout(() => setOpen(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const close = (forever: boolean) => {
    dismissInstall(forever)
    setOpen(false)
  }

  const browser = platform === 'android' ? 'le navigateur' : platform === 'ios-safari' ? 'Safari' : 'ce navigateur'

  return (
    <Sheet open={open} onClose={() => close(false)} label="Installer l'app">
      <div className="install-prompt__head">
        <span className="install-prompt__icon" aria-hidden>
          <Smartphone size={22} />
        </span>
        <div className="stack" style={{ gap: 2 }}>
          <span className="overline install-prompt__kicker">Application</span>
          <h2 className="display-l" style={{ margin: 0 }}>
            Installez Voyages
          </h2>
        </div>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Ajoutez-la à votre écran d'accueil : elle s'ouvre en plein écran, comme une vraie app, et vos billets restent disponibles sans réseau.
      </p>

      <InstallSteps platform={platform} onInstalled={() => close(true)} />

      <p className="caption muted" style={{ margin: 0 }}>
        Ouvrez ensuite Voyages depuis l'écran d'accueil et connectez-vous une fois dedans : l'app installée ne partage pas la session de {browser}.
        {platform === 'ios-autre' && ' Si l’option n’apparaît pas, ouvrez cette page dans Safari.'}
      </p>

      <div className="stack" style={{ gap: 6 }}>
        <button className="btn btn--ghost" onClick={() => close(false)}>
          Plus tard
        </button>
        <button className="install-prompt__never caption" onClick={() => close(true)}>
          Ne plus afficher
        </button>
      </div>
    </Sheet>
  )
}
