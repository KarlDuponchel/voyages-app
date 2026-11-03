import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Sheet.css'

/** Distance (px) ou vitesse (px/ms) de glissement vers le bas au-delà de laquelle le panneau se ferme */
const CLOSE_DISTANCE = 110
const CLOSE_VELOCITY = 0.6

/**
 * Panneau qui monte du bas de l'écran (bottom sheet).
 * Se ferme par la croix, en touchant le fond, avec Échap, ou en le faisant glisser vers le bas
 * (depuis la poignée, ou depuis n'importe où quand le contenu est déjà tout en haut et que le clavier est fermé).
 * Clavier ouvert, le panneau tient dans la partie visible de l'écran (visualViewport) : rien ne passe sous le clavier.
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const sheet = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  // Clavier ouvert sur iPhone : la zone visible rétrécit (et peut défiler) sans que la page change de taille.
  // Le fond suit cette zone, pour que le bas du panneau reste au-dessus du clavier.
  useEffect(() => {
    const vv = window.visualViewport
    const el = backdrop.current
    if (!open || !vv || !el) return
    const fit = () => {
      el.style.top = `${vv.offsetTop}px`
      el.style.height = `${vv.height}px`
      el.style.bottom = 'auto'
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [open])

  // Glisser vers le bas pour fermer. Écouteurs natifs : sur iPhone, il faut pouvoir bloquer le
  // défilement (preventDefault) pendant le glissement, ce que React ne permet pas (écouteurs passifs).
  useEffect(() => {
    const el = sheet.current
    if (!open || !el) return
    let startY = 0
    let startTime = 0
    let dy = 0
    let tracking = false // le doigt est posé et un glissement vers le bas est possible
    let dragging = false // le panneau suit le doigt

    const onStart = (e: TouchEvent) => {
      const fromHandle = (e.target as HTMLElement).closest('.sheet__top') !== null
      // Dans le contenu, on ne ferme que si le panneau est déjà tout en haut (sinon on défile),
      // et jamais clavier ouvert : on fait alors défiler les suggestions, pas fermer par erreur
      const typing = el.contains(document.activeElement) && !!document.activeElement?.matches('input, textarea, select')
      tracking = fromHandle || (el.scrollTop <= 0 && !typing)
      dragging = false
      dy = 0
      startY = e.touches[0].clientY
      startTime = performance.now()
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      dy = e.touches[0].clientY - startY
      if (!dragging) {
        if (dy < 6) {
          if (dy < -6) tracking = false // le doigt monte : défilement normal
          return
        }
        dragging = true
        el.style.transition = 'none'
      }
      e.preventDefault()
      el.style.transform = `translateY(${Math.max(0, dy)}px)`
    }
    const onEnd = () => {
      if (!dragging) return
      const velocity = dy / Math.max(1, performance.now() - startTime)
      el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)'
      if (dy > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
        el.style.transform = 'translateY(100%)'
        setTimeout(() => close.current(), 200)
      } else {
        el.style.transform = ''
      }
      dragging = false
      tracking = false
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div ref={backdrop} className="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__top">
          <div className="sheet__grab" aria-hidden />
          <button type="button" className="sheet__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
