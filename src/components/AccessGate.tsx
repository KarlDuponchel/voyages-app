import { Lock } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import '../screens/Connexion.css'

/**
 * Code d'accès demandé avant l'app (même avant la connexion), tant qu'elle n'est pas ouverte au public.
 * C'est un simple verrou de façade : les données restent protégées par la connexion et la sécurité
 * de la base. Seule l'empreinte du code est dans l'app ; pour le changer, recalculer CODE_HASH :
 *   node -e "console.log(require('crypto').createHash('sha256').update('voyages:NOUVEAU_CODE').digest('hex'))"
 * Un nouveau code redemande la saisie sur tous les appareils.
 */
const CODE_HASH = '2786dac2f071901ded30244346c7d6c055d1071678061e7b2a19fb0ac59e595f'
const STORAGE_KEY = 'voyages:acces'

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function unlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === CODE_HASH
  } catch {
    return false
  }
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(unlocked)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  if (open) return <>{children}</>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if ((await sha256(`voyages:${code.trim()}`)) !== CODE_HASH) {
      setError(true)
      setCode('')
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, CODE_HASH)
    } catch {
      // Stockage indisponible (navigation privée) : le code sera redemandé à la prochaine ouverture
    }
    setOpen(true)
  }

  return (
    <main className="connexion">
      <img src="/logo.svg" alt="" className="connexion__logo" />
      <div className="stack" style={{ gap: 6 }}>
        <span className="overline muted">Accès privé</span>
        <h1 className="display-xl">Voyages</h1>
        <p className="muted" style={{ margin: 0 }}>
          L’app est encore en test. Entrez le code d’accès qu’on vous a donné.
        </p>
      </div>
      <form onSubmit={submit}>
        <label className="field">
          <span className="overline muted">Code d’accès</span>
          <input
            className="input connexion__code"
            inputMode="numeric"
            autoComplete="off"
            required
            autoFocus
            maxLength={12}
            placeholder="••••"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError(false)
            }}
          />
        </label>
        {error && (
          <p className="caption form-error" role="alert">
            Code incorrect.
          </p>
        )}
        <button className="btn btn--accent" type="submit">
          <Lock size={16} /> Entrer
        </button>
      </form>
    </main>
  )
}
