import { BarChart3, Plane } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Globe } from '../components/Globe'
import { useAuth } from '../data/auth'
import { useTrips } from '../data/store'
import { daysUntil, formatNumber, formatRange } from '../lib/format'
import { visitedCities } from '../lib/stats'
import { mainPlace } from '../lib/trip'
import { useStats } from '../lib/useStats'
import './Monde.css'

export function Monde() {
  const { trips, visitedCountryIds } = useTrips()
  const { profile } = useAuth()
  const stats = useStats()
  const visitedIds = useMemo(() => new Set(visitedCountryIds), [visitedCountryIds])
  const pins = useMemo(() => visitedCities(trips), [trips])
  const next = useMemo(
    () => trips.filter((t) => daysUntil(t.end) >= 0).sort((a, b) => a.start.localeCompare(b.start))[0],
    [trips],
  )
  const highlight = useMemo(() => {
    const place = next && mainPlace(next)
    return place ? { name: place.city, lat: place.lat, lng: place.lng } : undefined
  }, [next])
  const globeSize = Math.min(320, window.innerWidth - 60)

  return (
    <main className="screen monde">
      <div className="monde__stars" aria-hidden />

      <header className="row between px">
        <div className="stack" style={{ gap: 4 }}>
          <span className="overline muted">{profile ? `Bonjour ${profile.displayName}` : 'Bonjour'}</span>
          <h1 className="display-xl">Votre monde</h1>
        </div>
        <Link to="/stats" className="icon-btn" aria-label="Statistiques détaillées">
          <BarChart3 size={20} />
        </Link>
      </header>

      <section className="monde__globe">
        <Globe visitedIds={visitedIds} pins={pins} highlight={highlight} size={globeSize} />
        {next && (
          <span className="pill monde__tag">
            <i aria-hidden /> {next.title} · {daysUntil(next.start) > 0 ? `J-${daysUntil(next.start)}` : 'en cours'}
          </span>
        )}
      </section>

      <section className="px stack" style={{ gap: 10 }}>
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <span className="numeric-l">{formatNumber(stats.worldPercent, 1)} %</span>
            <span className="muted">du monde exploré</span>
          </div>
          <span className="caption muted">
            {stats.countries} / 195 pays
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(stats.worldPercent)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${stats.worldPercent}%` }} />
        </div>
      </section>

      <section className="px monde__tiles">
        <Link to="/stats" className="card tile">
          <span className="numeric-l">{stats.countries}</span>
          <span className="caption muted">pays</span>
        </Link>
        <Link to="/stats" className="card tile">
          <span className="numeric-l">
            {stats.continentsVisited}/{stats.continentsTotal}
          </span>
          <span className="caption muted">continents</span>
        </Link>
        <Link to="/stats" className="card tile">
          <span className="numeric-l">{stats.cities}</span>
          <span className="caption muted">villes</span>
        </Link>
      </section>

      {next && (
        <section className="px">
          <Link to={`/voyages/${next.id}`} className="monde__next">
            <div className="stack" style={{ gap: 2 }}>
              <span className="overline" style={{ opacity: 0.7 }}>
                Prochain départ · J-{Math.max(0, daysUntil(next.start))}
              </span>
              <span className="display-l">{next.title}</span>
              <span className="caption" style={{ opacity: 0.75 }}>
                {formatRange(next.start, next.end, false)} · {next.bookings.length} réservations
              </span>
            </div>
            <span className="monde__next-icon" aria-hidden>
              <Plane size={24} />
            </span>
          </Link>
        </section>
      )}
    </main>
  )
}
