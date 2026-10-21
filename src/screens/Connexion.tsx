import { ArrowRight, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../data/auth'
import { errorMessage } from '../lib/supabase'
import './Connexion.css'

/** Connexion ou création de compte, par code reçu par e-mail (sans mot de passe). */
export function Connexion() {
  const { sendCode, verifyCode } = useAuth()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invited = window.location.pathname.startsWith('/invitation/')

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

  const submitEmail = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await sendCode(email.trim())
      setStep('code')
    })
  }

  const submitCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const code = String(new FormData(e.currentTarget).get('code')).replace(/\D/g, '')
    run(() => verifyCode(email.trim(), code))
  }

  return (
    <main className="connexion">
      <img src="/logo.svg" alt="" className="connexion__logo" />
      <div className="stack" style={{ gap: 6 }}>
        <span className="overline muted">{invited ? 'Vous êtes invité à un voyage' : 'Bienvenue'}</span>
        <h1 className="display-xl">Voyages</h1>
        <p className="muted" style={{ margin: 0 }}>
          Billets, réservations et souvenirs au même endroit, à partager avec ceux qui partent avec vous.
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={submitEmail}>
          <label className="field">
            <span className="overline muted">Adresse e-mail</span>
            <input
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
            />
          </label>
          {error && (
            <p className="caption form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--accent" type="submit" disabled={busy}>
            <Mail size={16} /> {busy ? 'Envoi…' : 'Recevoir un code'}
          </button>
          <p className="caption muted" style={{ margin: 0 }}>
            Pas de mot de passe : on vous envoie un code à chaque connexion. Le compte est créé automatiquement la première fois.
          </p>
        </form>
      ) : (
        <form onSubmit={submitCode}>
          <label className="field">
            <span className="overline muted">Code reçu à {email}</span>
            <input
              className="input connexion__code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,10}"
              required
              autoFocus
              placeholder="000000"
            />
          </label>
          {error && (
            <p className="caption form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--accent" type="submit" disabled={busy}>
            <ArrowRight size={16} /> {busy ? 'Vérification…' : 'Se connecter'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setStep('email')} disabled={busy}>
            Changer d'adresse ou renvoyer un code
          </button>
        </form>
      )}
    </main>
  )
}
