import { Share, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BookingFile } from '../data/types'
import { getFileBlob, isPdf } from '../lib/files'
import { errorMessage } from '../lib/supabase'
import { usePinchZoom } from '../lib/usePinchZoom'
import './FileViewer.css'

/**
 * Affichage plein écran d'un billet (PDF ou image), sur fond blanc pour que le QR code se scanne bien.
 * Marche hors ligne si le fichier a été copié sur le téléphone. Le pincement ne zoome que le document.
 */
export function FileViewer({ file, onClose }: { file: BookingFile; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(true)
  const pages = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const zoomed = useRef<HTMLDivElement>(null)
  usePinchZoom(body, zoomed)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    let stopPdf: (() => void) | null = null
    setError(null)
    setRendering(true)

    getFileBlob(file)
      .then(async (b) => {
        if (cancelled) return
        setBlob(b)
        if (isPdf(file)) {
          const { renderPdf } = await import('../lib/pdf')
          if (cancelled || !pages.current) return
          pages.current.replaceChildren()
          const width = Math.min(pages.current.clientWidth, 900)
          stopPdf = await renderPdf(b, pages.current, width)
        } else {
          url = URL.createObjectURL(b)
          setImageUrl(url)
        }
      })
      .catch((e) => !cancelled && setError(navigator.onLine ? errorMessage(e) : "Ce fichier n'a pas encore été copié sur le téléphone. Ouvrez-le une fois avec du réseau."))
      .finally(() => !cancelled && setRendering(false))

    return () => {
      cancelled = true
      stopPdf?.()
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  const share = async () => {
    if (!blob) return
    const shared = new File([blob], file.name, { type: blob.type || file.mimeType })
    try {
      if (navigator.canShare?.({ files: [shared] })) {
        await navigator.share({ files: [shared], title: file.name })
        return
      }
    } catch {
      return // partage annulé
    }
    // Pas de partage de fichiers (ordinateur) : téléchargement
    const a = document.createElement('a')
    a.href = URL.createObjectURL(shared)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={file.name}>
      <header className="viewer__bar">
        <button className="icon-btn" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>
        <span className="caption viewer__name">{file.name}</span>
        <button className="icon-btn" onClick={share} disabled={!blob} aria-label="Partager ou enregistrer">
          <Share size={20} />
        </button>
      </header>

      <div ref={body} className="viewer__body">
        {rendering && !error && <p className="caption muted viewer__status">Ouverture…</p>}
        {error && (
          <p className="caption form-error viewer__status" role="alert">
            {error}
          </p>
        )}
        <div ref={zoomed} className="viewer__zoom">
          {imageUrl && <img src={imageUrl} alt={file.name} className="viewer__image" draggable={false} />}
          <div ref={pages} className="viewer__pages" />
        </div>
      </div>

      {!error && (
        <p className="caption muted viewer__hint">Pincez ou touchez deux fois pour agrandir. Montez la luminosité pour faire scanner le QR code.</p>
      )}
    </div>,
    document.body,
  )
}
