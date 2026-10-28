import { ChevronRight, Play, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { StoryPlayer } from '../components/StoryPlayer'
import { TripCover } from '../components/TripCover'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { daysUntil, formatMonthYear, formatNumber, formatRange, parseLocal } from '../lib/format'
import { canEdit, photoCount, titleWithCountries } from '../lib/trip'
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
  const navigate = useNavigate()
  /** Voyage dont on regarde le diaporama « Revivre » */
  const [playing, setPlaying] = useState<Trip | null>(null)
  const [choosing, setChoosing] = useState(false)
  const editable = trips.filter(canEdit).sort((a, b) => b.start.localeCompare(a.start))
  const sorted = [...trips].sort((a, b) => b.start.localeCompare(a.start))
  const past = sorted.filter((t) => daysUntil(t.end) < 0)
  const memory = memoryOfTheDay(past)
  const totalPhotos = trips.reduce((s, t) => s + t.photos, 0)

  return (
    <main className="screen souvenirs">
      <header className="row between px">
        <div className="stack" style={{ gap: 4 }}>
          <span className="overline muted">
            {past.length} voyage{past.length > 1 ? 's' : ''} · {totalPhotos > 1 ? `${formatNumber(totalPhotos)} photos` : photoCount(totalPhotos)}
          </span>
          <h1 className="display-xl">Souvenirs</h1>
        </div>
        {editable.length > 0 && (
          <button className="icon-btn icon-btn--accent" aria-label="Ajouter des photos" onClick={() => setChoosing(true)}>
            <Plus size={20} />
          </button>
        )}
      </header>

      <section className="stories" aria-label="Stories de voyage">
        {past.map((t, i) => {
          const inner = (
            <>
              <span className={`story__ring ${i < 2 ? 'is-new' : ''}`}>
                <span className="story__photo">
                  <TripCover trip={t} />
                </span>
              </span>
              <span className={`caption ${i < 2 ? '' : 'muted'}`}>{t.title}</span>
            </>
          )
          // Avec des photos : la story se joue ; sans : on ouvre le voyage
          return t.photos > 0 ? (
            <button key={t.id} className="story" onClick={() => setPlaying(t)} aria-label={`Revivre ${t.title}`}>
              {inner}
            </button>
          ) : (
            <Link key={t.id} to={`/voyages/${t.id}`} className="story">
              {inner}
            </Link>
          )
        })}
      </section>

      {memory && (
        <section className="px">
          {(() => {
            const m = memory.trip
            const body = (
              <>
                <TripCover trip={m} large />
                <span className="pill memory__tag overline">
                  <Sparkles size={14} /> {memory.label}
                </span>
                <span className="memory__bottom">
                  <span className="stack" style={{ gap: 2 }}>
                    <span className="display-l">{titleWithCountries(m)}</span>
                    <span className="caption" style={{ opacity: 0.8 }}>
                      {formatRange(m.start, m.end)} · {photoCount(m.photos)}
                    </span>
                  </span>
                  {m.photos > 0 && (
                    <span className="pill memory__play">
                      <Play size={14} /> Revivre
                    </span>
                  )}
                </span>
              </>
            )
            return m.photos > 0 ? (
              <button className="memory" onClick={() => setPlaying(m)} aria-label={`Revivre ${m.title}`}>
                {body}
              </button>
            ) : (
              <Link to={`/voyages/${m.id}`} className="memory">
                {body}
              </Link>
            )
          })()}
        </section>
      )}

      <section className="px stack" style={{ gap: 12 }}>
        <div className="row between">
          <h2 className="title-m">Tous vos voyages</h2>
        </div>
        <div className="memory-grid">
          {sorted.map((t) => (
            <Link key={t.id} to={`/voyages/${t.id}`} className="memory-card">
              <TripCover trip={t} />
              <span className="memory-card__text">
                <span className="title-m">{t.title}</span>
                <span className="caption" style={{ opacity: 0.75 }}>
                  {formatMonthYear(t.start)} · {daysUntil(t.end) >= 0 ? 'bientôt' : photoCount(t.photos)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {playing && <StoryPlayer trip={playing} onClose={() => setPlaying(null)} />}

      <Sheet open={choosing} onClose={() => setChoosing(false)} label="Ajouter des photos">
        <div className="stack" style={{ gap: 4 }}>
          <h2 className="display-l">Ajouter des photos</h2>
          <p className="caption muted" style={{ margin: 0 }}>
            À quel voyage ?
          </p>
        </div>
        <ul className="choose-trip">
          {editable.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => {
                  setChoosing(false)
                  navigate(`/voyages/${t.id}?onglet=photos`)
                }}
              >
                <span className="choose-trip__cover">
                  <TripCover trip={t} />
                </span>
                <span className="stack" style={{ gap: 0, flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="strong">{t.title}</span>
                  <span className="caption muted">{formatRange(t.start, t.end)}</span>
                </span>
                <ChevronRight size={18} className="muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </main>
  )
}
