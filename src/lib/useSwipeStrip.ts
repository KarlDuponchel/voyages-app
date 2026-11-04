import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Bande de photos qui suit le doigt, pour les visionneuses (photos d'un voyage, Explorer).
 *
 * La bande (`track`) contient la photo affichée et ses deux voisines, placées à ±(100 % + GAP).
 * - Un doigt glissé à l'horizontale déplace la bande en direct ; au bout de la série, avec résistance.
 * - Au lâcher : on passe à la voisine si le geste est assez long (un quart de l'écran) ou assez vif,
 *   sinon la photo revient en place. La fin du mouvement est animée, puis `go` change l'index.
 * - Pendant un zoom (classe `is-zoomed` sur `stage`) ou un pincement, la bande ne bouge pas.
 *
 * Renvoie `slide(±1)` pour les flèches et le clavier, avec la même animation.
 */
const GAP = 16
const SETTLE_MS = 300
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** Vitesse (px/ms) au-delà de laquelle un geste court suffit */
const FLICK = 0.35

type Drag = { x: number; y: number; dx: number; mode: 'h' | 'no' | null; lastX: number; lastT: number; v: number }

export function useSwipeStrip(
  stage: RefObject<HTMLElement | null>,
  track: RefObject<HTMLElement | null>,
  { index, count, go }: { index: number; count: number; go: (i: number) => void },
): (dir: 1 | -1) => void {
  const latest = useRef({ index, count, go })
  latest.current = { index, count, go }
  const moving = useRef(false)
  const slideRef = useRef<(dir: 1 | -1) => void>(() => {})

  // Nouvelle photo : la bande revient à zéro sans animation, la voisine étant déjà à cette place
  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = ''
    moving.current = false
  }, [index, track])

  useEffect(() => {
    const zone = stage.current
    const el = track.current
    if (!zone || !el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let drag: Drag | null = null
    let timer = 0

    const place = (x: number, animate: boolean) => {
      el.style.transition = animate ? `transform ${SETTLE_MS}ms ${EASE}` : 'none'
      el.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''
    }
    const exists = (dir: number) => {
      const i = latest.current.index + dir
      return i >= 0 && i < latest.current.count
    }
    const settle = (dir: -1 | 0 | 1) => {
      if (dir === 0 || !exists(dir)) return place(0, !reduce.matches)
      const target = latest.current.index + dir
      if (reduce.matches) return latest.current.go(target)
      moving.current = true
      place(-dir * (zone.clientWidth + GAP), true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        latest.current.go(target)
        // Garde-fou : si l'index n'a pas changé, la bande ne doit pas rester bloquée
        window.setTimeout(() => (moving.current = false), 50)
      }, SETTLE_MS)
    }
    slideRef.current = (dir) => {
      if (!moving.current) settle(dir)
    }

    const onStart = (e: TouchEvent) => {
      if (moving.current || e.touches.length !== 1 || zone.classList.contains('is-zoomed')) {
        // Deuxième doigt posé pendant un glissement : la photo revient, le pincement prend la main
        if (drag?.mode === 'h') settle(0)
        drag = null
        return
      }
      const t = e.touches[0]
      drag = { x: t.clientX, y: t.clientY, dx: 0, mode: null, lastX: t.clientX, lastT: e.timeStamp, v: 0 }
    }

    const onMove = (e: TouchEvent) => {
      if (!drag || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = t.clientX - drag.x
      const dy = t.clientY - drag.y
      if (!drag.mode) {
        if (Math.hypot(dx, dy) < 8) return
        drag.mode = Math.abs(dx) > Math.abs(dy) ? 'h' : 'no'
      }
      if (drag.mode !== 'h') return
      e.preventDefault()
      const dt = e.timeStamp - drag.lastT
      if (dt > 0) drag.v = drag.v * 0.4 + ((t.clientX - drag.lastX) / dt) * 0.6
      drag.lastX = t.clientX
      drag.lastT = e.timeStamp
      drag.dx = dx
      // Au bout de la série, la bande résiste
      place(exists(dx < 0 ? 1 : -1) ? dx : dx * 0.3, false)
    }

    const onEnd = (e: TouchEvent) => {
      const d = drag
      if (!d || e.touches.length > 0) return
      drag = null
      if (d.mode !== 'h') return
      // Un doigt arrêté avant de lâcher ne compte plus comme un geste vif
      const v = e.timeStamp - d.lastT > 80 ? 0 : d.v
      const far = Math.abs(d.dx) > zone.clientWidth * 0.25
      const flick = Math.abs(v) > FLICK && Math.abs(d.dx) > 10
      const against = Math.abs(v) > FLICK && Math.sign(v) !== Math.sign(d.dx)
      settle((far || flick) && !against ? (d.dx < 0 ? 1 : -1) : 0)
    }

    zone.addEventListener('touchstart', onStart, { passive: true })
    zone.addEventListener('touchmove', onMove, { passive: false })
    zone.addEventListener('touchend', onEnd)
    zone.addEventListener('touchcancel', onEnd)
    return () => {
      window.clearTimeout(timer)
      zone.removeEventListener('touchstart', onStart)
      zone.removeEventListener('touchmove', onMove)
      zone.removeEventListener('touchend', onEnd)
      zone.removeEventListener('touchcancel', onEnd)
    }
  }, [stage, track])

  return (dir) => slideRef.current(dir)
}
