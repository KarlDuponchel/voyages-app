import { ChevronLeft, ChevronRight, Globe, ImageIcon, Share, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../data/auth'
import type { Trip } from '../data/types'
import { getCachedBlob } from '../lib/files'
import { deletePhoto, setCover, usePhotoUrl, videoUrl, type TripPhoto } from '../lib/photos'
import { unpublishPhoto } from '../lib/sharing'
import { errorMessage } from '../lib/supabase'
import { canEdit } from '../lib/trip'
import { usePinchZoom } from '../lib/usePinchZoom'
import { useSwipeStrip } from '../lib/useSwipeStrip'
import { PublishPanel } from './PublishPanel'
import { ViewerBackdrop, ViewerStrip } from './ViewerStrip'
import './PhotoViewer.css'

/** `active` : photo affichée ; ses voisines chargent leur image, mais pas leur vidéo */
function Media({ photo, active }: { photo: TripPhoto; active: boolean }) {
  const thumb = usePhotoUrl(photo.thumbPath)
  const full = usePhotoUrl(photo.kind === 'photo' ? photo.path : undefined)
  const [video, setVideo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setVideo(null)
    setError(null)
    if (photo.kind !== 'video' || !active) return
    videoUrl(photo.path)
      .then(setVideo)
      .catch(() => setError(navigator.onLine ? 'Vidéo introuvable.' : 'Hors ligne : les vidéos se lisent avec du réseau.'))
  }, [photo, active])

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
  const track = useRef<HTMLDivElement>(null)
  const resetZoom = usePinchZoom(stage, zoomed)
  // Fond flou : la miniature de la photo affichée (déjà en mémoire, voir usePhotoUrl)
  const backdrop = usePhotoUrl(photo?.thumbPath)
  const [confirm, setConfirm] = useState(false)
  /** Panneau de publication, ou confirmation du retrait */
  const [sharing, setSharing] = useState<'publier' | 'retirer' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const me = session?.user.id
  const author = trip.members.find((m) => m.userId === photo.uploadedBy)?.name
  const canDelete = photo.uploadedBy === me || trip.role === 'owner'
  const isCover = trip.coverPhoto?.id === photo.id
  const isAuthor = !!me && photo.uploadedBy === me
  const canUnpublish = !!photo.share && (isAuthor || trip.role === 'owner')

  const go = (i: number) => {
    if (i < 0 || i >= photos.length) return
    resetZoom()
    setConfirm(false)
    setSharing(null)
    setError(null)
    onIndex(i)
  }
  const slide = useSwipeStrip(stage, track, { index, count: photos.length, go })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') slide(-1)
      if (e.key === 'ArrowRight') slide(1)
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
      <ViewerBackdrop src={backdrop} />
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

      <div ref={stage} className="viewer-photo__stage">
        <ViewerStrip items={photos} index={index} track={track} zoomed={zoomed} render={(p, active) => <Media photo={p} active={active} />} />
        {index > 0 && (
          <button className="viewer-photo__nav viewer-photo__nav--prev" onClick={() => slide(-1)} aria-label="Précédente">
            <ChevronLeft size={22} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button className="viewer-photo__nav viewer-photo__nav--next" onClick={() => slide(1)} aria-label="Suivante">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <footer className="viewer-photo__info">
        <span className="caption">
          {author ? `Ajoutée par ${author}` : 'Ajoutée par un voyageur'} · {date}
        </span>
        {photo.share && (
          <span className="caption viewer-photo__public">
            <Globe size={13} /> {photo.share.hidden ? `Masquée après des signalements · ${photo.share.city}` : `Publique · ${photo.share.city}`}
            {photo.share.caption && ` · « ${photo.share.caption} »`}
          </span>
        )}
        {error && <span className="caption form-error">{error}</span>}
        {sharing === 'publier' ? (
          <PublishPanel
            trip={trip}
            photo={photo}
            onCancel={() => setSharing(null)}
            onDone={async () => {
              setSharing(null)
              await onChanged()
            }}
            onUnpublish={canUnpublish ? () => setSharing('retirer') : undefined}
          />
        ) : sharing === 'retirer' ? (
          <div className="stack" style={{ gap: 8 }}>
            <span className="caption">Elle redevient visible des seuls voyageurs ; ses réactions sont effacées.</span>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--accent"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await unpublishPhoto(photo.id)
                    setSharing(null)
                    await onChanged()
                  })
                }
              >
                Retirer du public
              </button>
              <button className="btn btn--ghost viewer-photo__action" onClick={() => setSharing(null)} disabled={busy}>
                Annuler
              </button>
            </div>
          </div>
        ) : confirm ? (
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
                <ImageIcon size={16} /> {isCover ? 'En couverture' : 'Couverture'}
              </button>
            )}
            {isAuthor ? (
              <button className="btn btn--ghost viewer-photo__action" onClick={() => setSharing('publier')} disabled={busy}>
                <Globe size={16} /> {photo.share ? 'Publique' : 'Rendre publique'}
              </button>
            ) : (
              canUnpublish && (
                <button className="btn btn--ghost viewer-photo__action" onClick={() => setSharing('retirer')} disabled={busy}>
                  <Globe size={16} /> Retirer
                </button>
              )
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
