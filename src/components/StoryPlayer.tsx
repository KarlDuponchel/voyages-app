import { Pause, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Trip } from '../data/types'
import { formatRange } from '../lib/format'
import { listPhotos, usePhotoUrl, videoUrl, type TripPhoto } from '../lib/photos'
import { tripCountries } from '../lib/trip'
import './StoryPlayer.css'

/** Durée d'une photo à l'écran */
const PHOTO_MS = 4000
/** Une vidéo plus longue est coupée, pour garder le rythme d'un diaporama */
const VIDEO_MAX_MS = 30_000
/** Appui maintenu au-delà duquel on met en pause (en dessous, c'est un appui pour avancer) */
const HOLD_MS = 220

/** Image préchargée (la suivante), pour un enchaînement sans attente */
function Preload({ path }: { path?: string }) {
  const url = usePhotoUrl(path)
  return url ? <img src={url} alt="" hidden /> : null
}

function Still({ photo }: { photo: TripPhoto }) {
  const thumb = usePhotoUrl(photo.thumbPath)
  const full = usePhotoUrl(photo.path)
  const src = full ?? thumb
  return src ? <img className="story-player__media story-player__media--photo" src={src} alt="" draggable={false} /> : null
}

/**
 * « Revivre » : diaporama plein écran des photos et vidéos d'un voyage, façon stories.
 * Appui à droite : suivant ; à gauche : précédent ; appui maintenu : pause ; glisser vers le bas : fermer.
 */
export function StoryPlayer({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [photos, setPhotos] = useState<TripPhoto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [ended, setEnded] = useState(false)
  // Un seul élément vidéo pour toute la séance : une fois le son activé d'un geste, Safari le garde
  const video = useRef<HTMLVideoElement>(null)
  const press = useRef<{ t: number; x: number; y: number } | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    listPhotos(trip.id)
      .then((p) => (p.length ? setPhotos(p) : setError('Pas encore de photos dans ce voyage.')))
      .catch(() => setError(navigator.onLine ? 'Impossible de charger les photos.' : 'Hors ligne : les photos se chargent avec du réseau.'))
  }, [trip.id])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') previous()
      if (e.key === ' ') setPaused((p) => !p)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  })

  const current = photos?.[index]
  const count = photos?.length ?? 0

  function next() {
    if (!photos) return
    if (index + 1 >= photos.length) setEnded(true)
    else {
      setIndex(index + 1)
      setProgress(0)
    }
  }
  function previous() {
    setEnded(false)
    setProgress(0)
    setIndex((i) => Math.max(0, i - 1))
  }

  // Photos : minuterie (en pause, elle s'arrête et reprend où elle en était)
  useEffect(() => {
    if (!current || current.kind !== 'photo' || paused || ended) return
    const start = performance.now() - progress * PHOTO_MS
    let frame = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / PHOTO_MS)
      setProgress(p)
      if (p >= 1) next()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, paused, ended])

  // Vidéos : lecture dans l'élément unique, progression suivie sur la lecture réelle
  useEffect(() => {
    const v = video.current
    if (!v || !current || current.kind !== 'video') return
    let cancelled = false
    videoUrl(current.path)
      .then((url) => {
        if (cancelled) return
        v.src = url
        v.currentTime = 0
        v.play().catch(() => setPaused(true))
      })
      .catch(() => !cancelled && next())
    return () => {
      cancelled = true
      v.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  useEffect(() => {
    const v = video.current
    if (!v || current?.kind !== 'video') return
    if (paused || ended) v.pause()
    else v.play().catch(() => {})
  }, [paused, ended, current?.kind])

  const onVideoTime = () => {
    const v = video.current
    if (!v || !v.duration) return
    const total = Math.min(v.duration, VIDEO_MAX_MS / 1000)
    const p = Math.min(1, v.currentTime / total)
    setProgress(p)
    if (p >= 1) next()
  }

  // Appuis : court à gauche ou à droite pour naviguer, long pour mettre en pause, glisser vers le bas pour fermer
  const onDown = (e: React.PointerEvent) => {
    press.current = { t: Date.now(), x: e.clientX, y: e.clientY }
    holdTimer.current = setTimeout(() => setPaused(true), HOLD_MS)
  }
  const onUp = (e: React.PointerEvent) => {
    clearTimeout(holdTimer.current)
    const p = press.current
    press.current = null
    if (!p) return
    if (e.clientY - p.y > 90) return onClose()
    if (Date.now() - p.t >= HOLD_MS) return setPaused(false)
    if (ended) return
    if (e.clientX < window.innerWidth * 0.33) previous()
    else next()
  }

  const date = current ? new Date(current.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return createPortal(
    <div className="story-player" role="dialog" aria-modal="true" aria-label={`Revivre ${trip.title}`}>
      <div className="story-player__bars" aria-hidden>
        {photos?.map((p, i) => (
          <span key={p.id} className="story-player__bar">
            <span style={{ transform: `scaleX(${i < index || ended ? 1 : i === index ? progress : 0})` }} />
          </span>
        ))}
      </div>

      <header className="story-player__head">
        <div className="stack" style={{ gap: 0, minWidth: 0 }}>
          <span className="strong">{trip.title}</span>
          <span className="caption">{date}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {paused && <Pause size={18} aria-label="En pause" />}
          {current?.kind === 'video' && (
            <button
              className="story-player__icon"
              onClick={() => {
                setMuted(!muted)
                if (video.current) video.current.muted = !muted
              }}
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          )}
          <button className="story-player__icon" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>
        </div>
      </header>

      <div
        className="story-player__stage"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => {
          clearTimeout(holdTimer.current)
          press.current = null
          setPaused(false)
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {current?.kind === 'photo' && <Still key={current.id} photo={current} />}
        <video
          ref={video}
          className="story-player__media"
          hidden={current?.kind !== 'video'}
          playsInline
          muted={muted}
          onTimeUpdate={onVideoTime}
          onEnded={next}
        />
        {photos?.[index + 1]?.kind === 'photo' && <Preload path={photos[index + 1].path} />}

        {!photos && !error && <p className="caption story-player__message">Chargement…</p>}
        {error && <p className="caption story-player__message">{error}</p>}

        {ended && (
          <div className="story-player__end" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <span className="overline">Fin du voyage</span>
            <span className="display-l">{trip.title}</span>
            <span className="caption">
              {[tripCountries(trip) !== trip.title ? tripCountries(trip) : null, formatRange(trip.start, trip.end), `${count} souvenir${count > 1 ? 's' : ''}`]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button
                className="btn btn--accent"
                onClick={() => {
                  setEnded(false)
                  setIndex(0)
                  setProgress(0)
                }}
              >
                Revoir
              </button>
              <Link className="btn btn--ghost story-player__link" to={`/voyages/${trip.id}?onglet=photos`} onClick={onClose}>
                Voir les photos
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
