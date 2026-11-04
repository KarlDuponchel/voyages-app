import { ChevronLeft, ChevronRight, Flag, MoreHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../data/auth'
import { countryById } from '../data/countries'
import { monthLabel, REACTIONS, signedUrls, type PublicPhoto, type ReactionKind } from '../lib/explore'
import { blockUser, REPORT_REASONS, reportPhoto, type ReportReason } from '../lib/sharing'
import { errorMessage } from '../lib/supabase'
import { usePinchZoom } from '../lib/usePinchZoom'
import { useSwipeStrip } from '../lib/useSwipeStrip'
import { ViewerStrip } from './ViewerStrip'
import './PhotoViewer.css'

/** `active` : photo affichée ; ses voisines chargent déjà leur image en grand */
function Media({ photo, active }: { photo: PublicPhoto; active: boolean }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    setSrc(null)
    signedUrls([photo.path])
      .then((u) => setSrc(u[photo.path] ?? null))
      .catch(() => setSrc(null))
  }, [photo.path])
  if (photo.kind === 'video')
    return src && active ? (
      <video className="viewer-photo__media" src={src} poster={photo.thumbUrl} controls playsInline autoPlay />
    ) : (
      photo.thumbUrl && <img className="viewer-photo__media" src={photo.thumbUrl} alt="" />
    )
  const shown = src ?? photo.thumbUrl
  return shown ? <img className="viewer-photo__media" src={shown} alt={photo.caption ?? `Photo à ${photo.city}`} draggable={false} /> : null
}

/** Visionneuse d'Explorer : auteur, ville et mois, réactions, signalement et blocage */
export function PublicViewer({
  photos,
  index,
  onIndex,
  onClose,
  onReact,
  onBlocked,
}: {
  photos: PublicPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onReact: (photo: PublicPhoto, kind: ReactionKind) => void
  /** L'auteur vient d'être bloqué : ses photos disparaissent */
  onBlocked: (authorId: string) => void
}) {
  const { session } = useAuth()
  const photo = photos[index]
  const stage = useRef<HTMLDivElement>(null)
  const zoomed = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const resetZoom = usePinchZoom(stage, zoomed)
  const [menu, setMenu] = useState<null | 'menu' | 'signaler' | 'bloquer'>(null)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mine = photo?.author.id === session?.user.id

  const go = (i: number) => {
    if (i < 0 || i >= photos.length) return
    resetZoom()
    setMenu(null)
    setDone(null)
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

  if (!photo) return null

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

  const country = countryById(photo.countryId)?.name

  return createPortal(
    <div className="viewer-photo" role="dialog" aria-modal="true" aria-label={`Photos à ${photo.city}`}>
      <header className="viewer-photo__bar">
        <button className="icon-btn icon-btn--glass" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>
        <span className="caption">
          {index + 1} / {photos.length}
        </span>
        {mine ? (
          <span style={{ width: 40 }} />
        ) : (
          <button className="icon-btn icon-btn--glass" onClick={() => setMenu(menu ? null : 'menu')} aria-label="Plus d’options" aria-expanded={!!menu}>
            <MoreHorizontal size={20} />
          </button>
        )}
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
        <div className="row" style={{ gap: 10 }}>
          <span className="public__avatar" aria-hidden>
            {photo.author.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="strong public__author">{mine ? 'Vous' : photo.author.name}</span>
            <span className="caption">
              {photo.city}
              {country && country !== photo.city ? `, ${country}` : ''} · {monthLabel(photo.month)}
            </span>
          </div>
        </div>
        {photo.caption && <span className="public__caption">{photo.caption}</span>}

        {menu === 'menu' && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--ghost viewer-photo__action" onClick={() => setMenu('signaler')}>
              <Flag size={16} /> Signaler
            </button>
            <button className="btn btn--ghost viewer-photo__action" onClick={() => setMenu('bloquer')}>
              Bloquer {photo.author.name}
            </button>
          </div>
        )}
        {menu === 'signaler' && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="caption">Pourquoi signaler cette photo ?</span>
            <div className="publish__cities" role="radiogroup" aria-label="Motif">
              {REPORT_REASONS.map((r) => (
                <button key={r.value} role="radio" aria-checked={reason === r.value} className={reason === r.value ? 'is-active' : ''} onClick={() => setReason(r.value)}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--accent"
                style={{ flex: 1 }}
                disabled={!reason || busy}
                onClick={() =>
                  run(async () => {
                    if (!reason) return
                    await reportPhoto(photo.id, reason)
                    setMenu(null)
                    setReason(null)
                    setDone('Merci, la photo est signalée. Elle sera vérifiée.')
                  })
                }
              >
                Envoyer le signalement
              </button>
              <button className="btn btn--ghost viewer-photo__action" onClick={() => setMenu(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}
        {menu === 'bloquer' && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="caption">
              Vous ne verrez plus les photos de {photo.author.name}, et {photo.author.name} ne verra plus les vôtres. Rien ne lui est signalé.
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--accent"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await blockUser(photo.author.id)
                    setMenu(null)
                    onBlocked(photo.author.id)
                  })
                }
              >
                Bloquer
              </button>
              <button className="btn btn--ghost viewer-photo__action" onClick={() => setMenu(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}
        {done && <span className="caption">{done}</span>}
        {error && <span className="caption form-error">{error}</span>}

        {!menu && (
          <div className="public__reactions" role="group" aria-label="Réactions">
            {REACTIONS.map((r) => {
              const n = photo.reactions[r.kind] ?? 0
              return (
                <button
                  key={r.kind}
                  className={photo.mine === r.kind ? 'is-active' : ''}
                  aria-pressed={photo.mine === r.kind}
                  aria-label={`${r.label}${n ? `, ${n}` : ''}`}
                  onClick={() => onReact(photo, r.kind)}
                >
                  <span aria-hidden>{r.emoji}</span>
                  <span className="caption">{n > 0 ? n : r.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </footer>
    </div>,
    document.body,
  )
}
