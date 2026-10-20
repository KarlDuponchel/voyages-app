import { Monitor, Moon, RotateCcw, Share, Sun, SquarePlus } from 'lucide-react'
import { useState } from 'react'
import { useTrips } from '../data/store'
import { useTheme, type ThemeChoice } from '../theme/theme'
import './Profil.css'

const themeOptions: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: 'auto', label: 'Auto', Icon: Monitor },
  { value: 'clair', label: 'Clair', Icon: Sun },
  { value: 'sombre', label: 'Sombre', Icon: Moon },
]

export function Profil() {
  const { choice, setChoice } = useTheme()
  const { resetSample } = useTrips()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <main className="screen">
      <header className="px stack" style={{ gap: 4 }}>
        <span className="overline muted">Karl</span>
        <h1 className="display-xl">Profil</h1>
      </header>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Apparence</h2>
        <div className="card profil-card">
          <div className="profil-theme" role="radiogroup" aria-label="Thème">
            {themeOptions.map(({ value, label, Icon }) => (
              <button key={value} role="radio" aria-checked={choice === value} className={choice === value ? 'is-active' : ''} onClick={() => setChoice(value)}>
                <Icon size={20} />
                <span className="caption">{label}</span>
              </button>
            ))}
          </div>
          <p className="caption muted" style={{ margin: 0 }}>
            « Auto » suit le réglage clair/sombre de l'iPhone.
          </p>
        </div>
      </section>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Installer sur l'iPhone</h2>
        <ol className="card profil-card profil-steps">
          <li>
            Ouvrez l'app dans <span className="strong">Safari</span>.
          </li>
          <li>
            Touchez <Share size={15} aria-label="Partager" /> <span className="strong">Partager</span>.
          </li>
          <li>
            Choisissez <SquarePlus size={15} aria-hidden /> <span className="strong">Sur l'écran d'accueil</span>.
          </li>
        </ol>
      </section>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Données</h2>
        <div className="card profil-card">
          <p className="caption muted" style={{ margin: 0 }}>
            Les voyages sont enregistrés sur ce téléphone. La synchronisation entre vos deux téléphones arrivera avec la prochaine version.
          </p>
          {confirmReset ? (
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--accent"
                onClick={() => {
                  resetSample()
                  setConfirmReset(false)
                }}
              >
                Oui, tout remettre à zéro
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
            </div>
          ) : (
            <button className="btn btn--ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Revenir aux voyages d'exemple
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
