import { useEffect, useRef, type RefObject } from 'react'

/**
 * Zoom au pincement limité à un contenu (le billet), sans zoomer toute la page.
 *
 * - Deux doigts : zoom (1× à 5×) autour du point pincé, et déplacement en même temps.
 * - Un doigt, une fois zoomé : déplacement dans le document. Sans zoom, le défilement reste natif.
 * - Double tap : zoom 2,5× à l'endroit touché, ou retour à la taille normale.
 *
 * `area` reçoit les gestes (touch-action: pan-y pour que Safari ne zoome pas la page) ;
 * `content` est l'élément agrandi (transform, origine en haut à gauche).
 * Renvoie une fonction de remise à zéro (changement de document).
 */
const MIN = 1
const MAX = 5
const DOUBLE_TAP_SCALE = 2.5
const DOUBLE_TAP_MS = 280

type Point = { x: number; y: number }

const mid = (a: Touch, b: Touch): Point => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
const gap = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function usePinchZoom(area: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>): () => void {
  const resetRef = useRef<() => void>(() => {})

  useEffect(() => {
    const zone = area.current
    const el = content.current
    if (!zone || !el) return

    let scale = 1
    let tx = 0
    let ty = 0
    let pinch: { d0: number; s0: number; c: Point } | null = null
    let pan: { p0: Point; t0: Point } | null = null
    let lastTap = 0

    /** Coin haut-gauche du contenu sans zoom, en coordonnées d'écran */
    const origin = (): Point => {
      const r = el.getBoundingClientRect()
      return { x: r.left - tx, y: r.top - ty }
    }

    const apply = (animate = false) => {
      // Le contenu agrandi ne doit pas sortir entièrement de l'écran
      const w = el.offsetWidth
      const h = el.offsetHeight
      tx = clamp(tx, Math.min(0, w - w * scale), 0)
      ty = clamp(ty, Math.min(0, h - h * scale), 0)
      el.style.transition = animate ? 'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none'
      el.style.transform = scale === 1 ? '' : `translate(${tx}px, ${ty}px) scale(${scale})`
      zone.classList.toggle('is-zoomed', scale > 1)
    }

    /** Zoom vers `s` en gardant le point d'écran `m` immobile */
    const zoomAt = (s: number, m: Point, animate: boolean) => {
      const o = origin()
      const c = { x: (m.x - o.x - tx) / scale, y: (m.y - o.y - ty) / scale }
      scale = clamp(s, MIN, MAX)
      if (scale < 1.02) {
        scale = 1
        tx = 0
        ty = 0
      } else {
        tx = m.x - o.x - c.x * scale
        ty = m.y - o.y - c.y * scale
      }
      apply(animate)
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        const m = mid(a, b)
        const o = origin()
        pinch = { d0: gap(a, b), s0: scale, c: { x: (m.x - o.x - tx) / scale, y: (m.y - o.y - ty) / scale } }
        pan = null
      } else if (e.touches.length === 1) {
        const t = e.touches[0]
        const now = Date.now()
        if (now - lastTap < DOUBLE_TAP_MS) {
          e.preventDefault()
          lastTap = 0
          zoomAt(scale > 1 ? 1 : DOUBLE_TAP_SCALE, { x: t.clientX, y: t.clientY }, true)
          return
        }
        lastTap = now
        pan = scale > 1 ? { p0: { x: t.clientX, y: t.clientY }, t0: { x: tx, y: ty } } : null
      }
    }

    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault()
        const [a, b] = [e.touches[0], e.touches[1]]
        const m = mid(a, b)
        const o = origin()
        scale = clamp((pinch.s0 * gap(a, b)) / pinch.d0, MIN * 0.85, MAX)
        // Le point pincé suit les doigts : zoom et déplacement en un seul geste
        tx = m.x - o.x - pinch.c.x * scale
        ty = m.y - o.y - pinch.c.y * scale
        apply()
      } else if (pan && e.touches.length === 1) {
        e.preventDefault()
        lastTap = 0
        tx = pan.t0.x + (e.touches[0].clientX - pan.p0.x)
        ty = pan.t0.y + (e.touches[0].clientY - pan.p0.y)
        apply()
      }
    }

    const onEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null
        // Relâché sous 1× : retour en douceur à la taille normale
        if (scale < 1.02) {
          scale = 1
          tx = 0
          ty = 0
          apply(true)
        }
        // Un doigt reste posé : il continue en déplacement
        const t = e.touches[0]
        pan = t && scale > 1 ? { p0: { x: t.clientX, y: t.clientY }, t0: { x: tx, y: ty } } : null
      } else if (e.touches.length === 0) pan = null
    }

    // Safari : empêche le zoom de toute la page quand le geste commence dans le document
    const blockPageZoom = (e: Event) => e.preventDefault()

    zone.addEventListener('touchstart', onStart, { passive: false })
    zone.addEventListener('touchmove', onMove, { passive: false })
    zone.addEventListener('touchend', onEnd)
    zone.addEventListener('touchcancel', onEnd)
    zone.addEventListener('gesturestart', blockPageZoom)
    zone.addEventListener('gesturechange', blockPageZoom)

    resetRef.current = () => {
      scale = 1
      tx = 0
      ty = 0
      apply()
    }

    return () => {
      zone.removeEventListener('touchstart', onStart)
      zone.removeEventListener('touchmove', onMove)
      zone.removeEventListener('touchend', onEnd)
      zone.removeEventListener('touchcancel', onEnd)
      zone.removeEventListener('gesturestart', blockPageZoom)
      zone.removeEventListener('gesturechange', blockPageZoom)
    }
  }, [area, content])

  return () => resetRef.current()
}
