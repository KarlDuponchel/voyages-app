import { Download, EllipsisVertical, Share, SquarePlus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { canPromptInstall, onInstallPromptChange, promptInstall, type InstallPlatform } from '../lib/install'
import './InstallSteps.css'

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li>
    <span className="install-steps__n" aria-hidden>
      {n}
    </span>
    <span>{children}</span>
  </li>
)

const Strong = ({ children }: { children: ReactNode }) => <span className="strong">{children}</span>

/** Étapes d'installation selon l'appareil (utilisées par le message d'accueil et par le profil). */
export function InstallSteps({ platform, onInstalled }: { platform: InstallPlatform; onInstalled?: () => void }) {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  useEffect(() => onInstallPromptChange(() => setCanPrompt(canPromptInstall())), [])

  // Android (Chrome, Edge, Samsung) : le navigateur propose lui-même l'installation, en un bouton
  if (platform === 'android' && canPrompt)
    return (
      <button
        className="btn btn--accent"
        onClick={async () => {
          if (await promptInstall()) onInstalled?.()
        }}
      >
        <Download size={16} /> Installer l'app
      </button>
    )

  if (platform === 'ordinateur')
    return (
      <p className="caption muted" style={{ margin: 0 }}>
        Ouvrez l'app sur votre téléphone pour l'ajouter à son écran d'accueil.
      </p>
    )

  return (
    <ol className="install-steps">
      {platform === 'android' ? (
        <>
          <Step n={1}>
            Touchez <EllipsisVertical size={15} aria-label="le menu" /> <Strong>le menu</Strong> du navigateur.
          </Step>
          <Step n={2}>
            Choisissez <Strong>« Installer l'application »</Strong> ou <Strong>« Ajouter à l'écran d'accueil »</Strong>.
          </Step>
          <Step n={3}>Confirmez.</Step>
        </>
      ) : (
        <>
          <Step n={1}>
            Touchez <Share size={15} aria-label="Partager" /> <Strong>Partager</Strong>
            {platform === 'ios-safari' ? ' (en bas de Safari, ou dans le menu ••• à côté de l’adresse).' : ' dans la barre d’adresse.'}
          </Step>
          <Step n={2}>
            Choisissez <SquarePlus size={15} aria-hidden /> <Strong>« Sur l'écran d'accueil »</Strong> (sous « Plus » si besoin).
          </Step>
          <Step n={3}>
            Touchez <Strong>« Ajouter »</Strong>.
          </Step>
        </>
      )}
    </ol>
  )
}
