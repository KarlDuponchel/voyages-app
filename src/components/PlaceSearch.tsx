import { Globe2, Map as MapIcon, MapPin, TreePalm, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { searchPlaces, type Place } from '../lib/places'
import './PlaceSearch.css'

/** Icône de la sorte de lieu : repère pour une ville, globe pour un pays, palmier pour une île, carte pour une région */
function KindIcon({ kind }: { kind: Place['kind'] }) {
  const Icon = kind === 'pays' ? Globe2 : kind === 'ile' ? TreePalm : kind === 'region' ? MapIcon : MapPin
  return <Icon size={16} aria-hidden />
}

/** Champ de recherche de lieu (ville, pays, île, région) avec suggestions (nom, région, pays). */
export function PlaceSearch({
  label,
  value,
  onChange,
  placeholder = 'Lisbonne, Islande, Minorque…',
  citiesOnly = false,
}: {
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
  placeholder?: string
  /** Seulement des villes, sans pays, îles ni régions (ville de départ) */
  citiesOnly?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(q, ctrl.signal, citiesOnly)
        .then((r) => {
          setResults(r)
          setError(false)
        })
        .catch((e) => e.name !== 'AbortError' && setError(true))
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, citiesOnly])

  if (value)
    return (
      <div className="field">
        <span className="overline muted">{label}</span>
        <div className="input place-chosen">
          <MapPin size={16} aria-hidden />
          <span className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
            <span className="strong">{value.name}</span>
            <span className="caption muted">{value.detail}</span>
          </span>
          <button type="button" className="place-clear" onClick={() => onChange(null)} aria-label="Changer de ville">
            <X size={16} />
          </button>
        </div>
      </div>
    )

  return (
    <div className="field place-search">
      <label className="overline muted" htmlFor="place-search">
        {label}
      </label>
      <input
        id="place-search"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="place-results"
      />
      {error && <span className="caption muted">Recherche indisponible pour le moment (connexion ?).</span>}
      {results.length > 0 && (
        <ul id="place-results" className="place-results card" role="listbox">
          {results.map((p) => (
            <li key={`${p.name}-${p.lat}-${p.lng}`} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onChange(p)
                  setQuery('')
                  setResults([])
                }}
              >
                <KindIcon kind={p.kind} />
                <span className="stack" style={{ gap: 0 }}>
                  <span className="strong">{p.name}</span>
                  <span className="caption muted">{p.detail}</span>
                </span>
              </button>
            </li>
          ))}
          {/* Mention exigée par la licence CC BY 4.0 des données GeoNames */}
          <li className="place-credit caption muted">
            Lieux :{' '}
            <a href="https://www.geonames.org/" target="_blank" rel="noopener">
              GeoNames
            </a>{' '}
            (CC BY 4.0)
          </li>
        </ul>
      )}
    </div>
  )
}
