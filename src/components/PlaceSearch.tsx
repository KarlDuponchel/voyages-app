import { MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { searchPlaces, type Place } from '../lib/places'
import './PlaceSearch.css'

/** Champ de recherche de ville avec suggestions (nom, région, pays). */
export function PlaceSearch({
  label,
  value,
  onChange,
  placeholder = 'Lisbonne, Kyoto, New York…',
}: {
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
  placeholder?: string
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
      searchPlaces(q, ctrl.signal)
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
  }, [query])

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
                <MapPin size={16} aria-hidden />
                <span className="stack" style={{ gap: 0 }}>
                  <span className="strong">{p.name}</span>
                  <span className="caption muted">{p.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
