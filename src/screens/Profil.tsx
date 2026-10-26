import { Check, Copy, LogOut, Monitor, Moon, Plus, RefreshCw, Sun, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { InstallSteps } from '../components/InstallSteps'
import { PlaceSearch } from '../components/PlaceSearch'
import { useAuth } from '../data/auth'
import { allCountries, countryById } from '../data/countries'
import { useTrips } from '../data/store'
import { importAddress } from '../lib/importAddress'
import { installPlatform, isInstalled } from '../lib/install'
import type { Place } from '../lib/places'
import { errorMessage } from '../lib/supabase'
import { useTheme, type ThemeChoice } from '../theme/theme'
import './Profil.css'

const themeOptions: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: 'auto', label: 'Auto', Icon: Monitor },
  { value: 'clair', label: 'Clair', Icon: Sun },
  { value: 'sombre', label: 'Sombre', Icon: Moon },
]

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Pays visités : ceux des voyages terminés (automatiques) + ceux ajoutés à la main. */
function VisitedCountries() {
  const { visitedCountryIds, manualCountryIds, addCountry, removeCountry } = useTrips()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const manual = new Set(manualCountryIds)
  const visited = useMemo(
    () => visitedCountryIds.map(countryById).filter((c) => c !== undefined).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [visitedCountryIds],
  )
  const matches = useMemo(() => {
    const q = normalize(query.trim())
    if (q.length < 2) return []
    const seen = new Set(visitedCountryIds)
    return allCountries.filter((c) => !seen.has(c.id) && normalize(c.name).includes(q)).slice(0, 6)
  }, [query, visitedCountryIds])

  const run = async (action: Promise<void>) => {
    setError(null)
    try {
      await action
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="card profil-card">
      <p className="caption muted" style={{ margin: 0 }}>
        Les pays de vos voyages terminés sont ajoutés tout seuls. Ajoutez ici ceux visités avant l'app.
      </p>
      <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ajouter un pays…" aria-label="Ajouter un pays" />
      {matches.length > 0 && (
        <div className="profil-chips">
          {matches.map((c) => (
            <button
              key={c.id}
              className="pill profil-chip profil-chip--add"
              onClick={() => {
                setQuery('')
                run(addCountry(c.id))
              }}
            >
              <Plus size={14} /> {c.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="caption form-error">{error}</p>}
      {visited.length > 0 && (
        <div className="profil-chips">
          {visited.map((c) =>
            manual.has(c.id) ? (
              <button key={c.id} className="pill profil-chip" onClick={() => run(removeCountry(c.id))} aria-label={`Retirer ${c.name}`}>
                {c.name} <X size={13} />
              </button>
            ) : (
              <span key={c.id} className="pill profil-chip" title="Ajouté par un voyage">
                {c.name}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function Identity() {
  const { profile, updateProfile } = useAuth()
  const [editingHome, setEditingHome] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: Promise<void>) => {
    setError(null)
    try {
      await action
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const saveName = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name')).trim()
    if (name && name !== profile?.displayName) run(updateProfile({ displayName: name }))
  }

  const saveHome = (place: Place | null) => {
    if (!place) return
    setEditingHome(false)
    run(updateProfile({ homeCity: place.name, homeLat: place.lat, homeLng: place.lng }))
  }

  return (
    <div className="card profil-card">
      <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={saveName}>
        <label className="field" style={{ flex: 1 }}>
          <span className="overline muted">Prénom ou pseudo</span>
          <input className="input" name="name" defaultValue={profile?.displayName} key={profile?.displayName} maxLength={60} required />
        </label>
        <button className="btn btn--ghost" type="submit" aria-label="Enregistrer le nom">
          <Check size={16} />
        </button>
      </form>
      {editingHome || !profile?.homeCity ? (
        <PlaceSearch label="Ville de départ (pour les distances)" value={null} onChange={saveHome} placeholder="Paris, Lyon, Bruxelles…" />
      ) : (
        <div className="row between">
          <div className="stack" style={{ gap: 2 }}>
            <span className="overline muted">Ville de départ</span>
            <span className="strong">{profile.homeCity}</span>
          </div>
          <button className="btn btn--ghost" onClick={() => setEditingHome(true)}>
            Changer
          </button>
        </div>
      )}
      {saved && (
        <p className="caption muted" style={{ margin: 0 }} role="status">
          Enregistré.
        </p>
      )}
      {error && <p className="caption form-error">{error}</p>}
    </div>
  )
}

/** Adresse de transfert des confirmations de réservation, lues par l'IA */
function ImportByEmail({ address }: { address: string }) {
  const { session } = useAuth()
  const { regenerateImportAlias, imports } = useTrips()
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // presse-papiers indisponible : l'adresse reste sélectionnable
    }
  }

  return (
    <div className="card profil-card">
      <p className="caption muted" style={{ margin: 0 }}>
        Transférez vos confirmations (vol, train, hôtel…) à cette adresse depuis <span className="strong">{session?.user.email}</span> : l'IA les lit et
        vous les propose dans « E-mails à valider ».
      </p>
      <div className="profil-address">
        <span className="profil-address__text">{address}</span>
        <button className="btn btn--accent profil-address__copy" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiée' : 'Copier'}
        </button>
      </div>
      <p className="caption muted" style={{ margin: 0 }}>
        Les e-mails envoyés depuis une autre adresse sont ignorés.{' '}
        {imports.length > 0 && (
          <Link to="/imports" className="strong">
            Voir les e-mails à valider
          </Link>
        )}
      </p>
      {confirm ? (
        <>
          <p className="caption" style={{ margin: 0 }}>
            L'adresse actuelle cessera aussitôt de fonctionner. Utile si elle a circulé.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn--accent"
              style={{ flex: 1 }}
              onClick={() =>
                regenerateImportAlias()
                  .then(() => setConfirm(false))
                  .catch((e) => setError(errorMessage(e)))
              }
            >
              Oui, nouvelle adresse
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirm(false)}>
              Annuler
            </button>
          </div>
        </>
      ) : (
        <button className="btn btn--ghost" onClick={() => setConfirm(true)}>
          <RefreshCw size={16} /> Changer d'adresse
        </button>
      )}
      {error && <p className="caption form-error">{error}</p>}
    </div>
  )
}

function Account() {
  const { session, signOut, deleteAccount } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="card profil-card">
      <p className="caption muted" style={{ margin: 0 }}>
        Connecté avec {session?.user.email}
      </p>
      <button className="btn btn--ghost" onClick={signOut}>
        <LogOut size={16} /> Se déconnecter
      </button>
      {confirm ? (
        <>
          <p className="caption" style={{ margin: 0 }}>
            Votre compte, vos pays et votre place dans les voyages seront effacés définitivement. Les voyages partagés restent aux autres voyageurs.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn--accent"
              style={{ flex: 1 }}
              onClick={() => deleteAccount().catch((e) => setError(errorMessage(e)))}
            >
              Supprimer définitivement
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirm(false)}>
              Annuler
            </button>
          </div>
        </>
      ) : (
        <button className="btn btn--ghost" onClick={() => setConfirm(true)}>
          <Trash2 size={16} /> Supprimer mon compte
        </button>
      )}
      {error && <p className="caption form-error">{error}</p>}
    </div>
  )
}

export function Profil() {
  const { choice, setChoice } = useTheme()
  const { profile } = useAuth()
  const { importAlias } = useTrips()
  const address = importAddress(importAlias)

  return (
    <main className="screen">
      <header className="px stack" style={{ gap: 4 }}>
        <span className="overline muted">{profile?.displayName}</span>
        <h1 className="display-xl">Profil</h1>
      </header>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Vous</h2>
        <Identity />
      </section>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Pays visités</h2>
        <VisitedCountries />
      </section>

      {address && (
        <section className="px stack" style={{ gap: 10 }}>
          <h2 className="overline muted">Import par e-mail</h2>
          <ImportByEmail address={address} />
        </section>
      )}

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
            « Auto » suit le réglage clair/sombre du téléphone.
          </p>
        </div>
      </section>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Installer l'app</h2>
        <div className="card profil-card">
          {isInstalled() ? (
            <p className="caption muted" style={{ margin: 0 }}>
              <Check size={14} style={{ verticalAlign: -2, color: 'var(--accent-lagoon)' }} /> L'app est installée sur cet appareil.
            </p>
          ) : (
            <InstallSteps platform={installPlatform()} />
          )}
        </div>
      </section>

      <section className="px stack" style={{ gap: 10 }}>
        <h2 className="overline muted">Compte</h2>
        <Account />
      </section>
    </main>
  )
}
