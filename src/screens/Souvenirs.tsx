import { Play, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { daysUntil, formatMonthYear, formatNumber, formatRange, parseLocal } from '../lib/format'
import { tripCountries } from '../lib/trip'
import './Souvenirs.css'

/** Voyage qui avait lieu il y a un an (à une semaine près), sinon le plus récent. */
function memoryOfTheDay(past: Trip[], now = new Date()) {
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const week = 7 * 86_400_000
  const anniversary = past.find((t) => Math.abs(parseLocal(t.start).getTime() - lastYear.getTime()) < week)
  return anniversary ? { trip: anniversary, label: "Il y a 1 an aujourd'hui" } : past[0] ? { trip: past[0], label: 'Dernier voyage' } : null
}

export function Souvenirs() {
  const { trips } = useTrips()
  const [notice, setNotice] = useState(false)
  const sorted = [...trips].sort((a, b) => b.start.localeCompare(a.start))
  const past = sorted.filter((t) => daysUntil(t.end) < 0)
  const memory = memoryOfTheDay(past)
  const totalPhotos = trips.reduce((s, t) => s + t.photos, 0)

  return (
    <main className="screen souvenirs">
      <header className="row between px">
        <div className="stack" style={{ gap: 4 }}>
          <span className="overline muted">
            {past.length} voyages · {formatNumber(totalPhotos)} photos
          </span>
          <h1 className="display-xl">Souvenirs</h1>
        </div>
        <button className="icon-btn icon-btn--accent" aria-label="Importer des photos" onClick={() => setNotice(true)}>
          <Plus size={20} />
        </button>
      </header>

      {notice && (
        <p className="px caption muted" style={{ margin: 0 }} role="status">
          L'import des photos et vidéos arrive dans une prochaine version.
        </p>
      )}

      <section className="stories" aria-label="Stories de voyage">
        {past.map((t, i) => (
          <Link key={t.id} to={`/voyages/${t.id}`} className="story">
            <span className={`story__ring ${i < 2 ? 'is-new' : ''}`}>
              <span className="story__photo">
                <Cover colors={t.cover} />
              </span>
            </span>
            <span className={`caption ${i < 2 ? '' : 'muted'}`}>{t.title}</span>
          </Link>
        ))}
      </section>

      {memory && (
        <section className="px">
          <Link to={`/voyages/${memory.trip.id}`} className="memory">
            <Cover colors={memory.trip.cover} />
            <span className="pill memory__tag overline">
              <Sparkles size={14} /> {memory.label}
            </span>
            <span className="memory__bottom">
              <span className="stack" style={{ gap: 2 }}>
                <span className="display-l">
                  {memory.trip.title}, {tripCountries(memory.trip)}
                </span>
                <span className="caption" style={{ opacity: 0.8 }}>
                  {formatRange(memory.trip.start, memory.trip.end)} · {memory.trip.photos} photos
                </span>
              </span>
              <span className="pill memory__play">
                <Play size={14} /> Revivre
              </span>
            </span>
          </Link>
        </section>
      )}

      <section className="px stack" style={{ gap: 12 }}>
        <div className="row between">
          <h2 className="title-m">Tous vos voyages</h2>
        </div>
        <div className="memory-grid">
          {sorted.map((t) => (
            <Link key={t.id} to={`/voyages/${t.id}`} className="memory-card">
              <Cover colors={t.cover} />
              <span className="memory-card__text">
                <span className="title-m">{t.title}</span>
                <span className="caption" style={{ opacity: 0.75 }}>
                  {formatMonthYear(t.start)} · {daysUntil(t.end) >= 0 ? 'bientôt' : `${t.photos} photos`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
