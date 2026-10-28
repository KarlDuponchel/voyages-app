import { ChevronLeft, ChevronRight, ImageIcon, Share, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../data/auth'
import type { Trip } from '../data/types'
import { getCachedBlob } from '../lib/files'
import { deletePhoto, setCover, usePhotoUrl, videoUrl, type TripPhoto } from '../lib/photos'
import { errorMessage } from '../lib/supabase'
import { canEdit } from '../lib/trip'
import { usePinchZoom } from '../lib/usePinchZoom'
import './PhotoViewer.css'

/** Distance horizontale (px) au-delà de laquelle un glissement passe à l'élément suivant */
const SWIPE = 60

function Media({ photo }: { photo: TripPhoto }) {
  const thumb = usePhotoUrl(photo.thumbPath)
  const full = usePhotoUrl(photo.kind === 'photo' ? photo.path : undefined)
  const [video, setVideo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setVideo(null)
    setError(null)
    if (photo.kind !== 'video') return
    videoUrl(photo.path)
      .then(setVideo)
      .catch(() => setError(navigator.onLine ? 'Vidéo introuvable.' : 'Hors ligne : les vidéos se lisent avec du réseau.'))
  }, [photo])

  if (photo.kind === 'video')
    return (
      <>
        {video ? (
          <video className="viewer-photo__media" src={video} poster={thumb ?? undefined} controls playsInline autoPlay />
        ) : (
          thumb && <img className="viewer-photo__media" src={thumb} alt="" />
        )}
        {error && <p className="caption viewer-photo__error">{error}</p>}
      </>
    )
  // La miniature s'affiche aussitôt, la photo en grand la remplace dès qu'elle est chargée
  const src = full ?? thumb
  return src ? <img className="viewer-photo__media" src={src} alt="" draggable={false} /> : null
}

export function PhotoViewer({
  trip,
  photos,
  index,
  onIndex,
  onClose,
  onChanged,
}: {
  trip: Trip
  photos: TripPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const { session } = useAuth()
  const photo = photos[index]
  const stage = useRef<HTMLDivElement>(null)
  const zoomed = useRef<HTMLDivElement>(null)
  const resetZoom = usePinchZoom(stage, zoomed)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const me = session?.user.id
  const author = trip.members.find((m) => m.userId === photo.uploadedBy)?.name
  const canDelete = photo.uploadedBy === me || trip.role === 'owner'
  const isCover = trip.coverPhoto?.id === photo.id

  const go = (i: number) => {
    if (i < 0 || i >= photos.length) return
    resetZoom()
    setConfirm(false)
    setError(null)
    onIndex(i)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

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

  const share = () =>
    run(async () => {
      const blob =
        photo.kind === 'photo' ? await getCachedBlob('trip-photos', photo.path, 'image/jpeg') : await (await fetch(await videoUrl(photo.path))).blob()
      const name = `${trip.title}-${index + 1}.${photo.kind === 'photo' ? 'jpg' : 'mp4'}`
      const file = new File([blob], name, { type: photo.mimeType })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch(() => {})
        return
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })

  const remove = () =>
    run(async () => {
      await deletePhoto(photo)
      if (photos.length === 1) onClose()
      else onIndex(Math.min(index, photos.length - 2))
      setConfirm(false)
      await onChanged()
    })

  const date = new Date(photo.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })

  return createPortal(
    <div className="viewer-photo" role="dialog" aria-modal="true" aria-label="Photos du voyage">
      <header className="viewer-photo__bar">
        <button className="icon-btn icon-btn--glass" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>
        <span className="caption">
          {index + 1} / {photos.length}
        </span>
        <button className="icon-btn icon-btn--glass" onClick={share} disabled={busy} aria-label="Partager ou enregistrer">
          <Share size={20} />
        </button>
      </header>

      <div
        ref={stage}
        className="viewer-photo__stage"
        onTouchStart={(e) => {
          swipe.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
        }}
        onTouchEnd={(e) => {
          const start = swipe.current
          swipe.current = null
          // Pas de changement de photo pendant un zoom : le doigt déplace alors la photo
          if (!start || stage.current?.classList.contains('is-zoomed')) return
          const dx = e.changedTouches[0].clientX - start.x
          const dy = e.changedTouches[0].clientY - start.y
          if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? index + 1 : index - 1)
        }}
      >
        <div ref={zoomed} className="viewer-photo__zoom" key={photo.id}>
          <Media photo={photo} />
        </div>
        {index > 0 && (
          <button className="viewer-photo__nav viewer-photo__nav--prev" onClick={() => go(index - 1)} aria-label="Précédente">
            <ChevronLeft size={22} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button className="viewer-photo__nav viewer-photo__nav--next" onClick={() => go(index + 1)} aria-label="Suivante">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <footer className="viewer-photo__info">
        <span className="caption">
          {author ? `Ajoutée par ${author}` : 'Ajoutée par un voyageur'} · {date}
        </span>
        {error && <span className="caption form-error">{error}</span>}
        {confirm ? (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--accent" style={{ flex: 1 }} onClick={remove} disabled={busy}>
              <Trash2 size={16} /> Supprimer pour tous
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirm(false)} disabled={busy}>
              Annuler
            </button>
          </div>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            {canEdit(trip) && photo.kind === 'photo' && (
              <button
                className="btn btn--ghost viewer-photo__action"
                disabled={busy || isCover}
                onClick={() =>
                  run(async () => {
                    await setCover(trip.id, photo.id)
                    await onChanged()
                  })
                }
              >
                <ImageIcon size={16} /> {isCover ? 'Couverture du voyage' : 'Mettre en couverture'}
              </button>
            )}
            {canDelete && (
              <button className="btn btn--ghost viewer-photo__action" onClick={() => setConfirm(true)} disabled={busy} aria-label="Supprimer">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </footer>
    </div>,
    document.body,
  )
}
