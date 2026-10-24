import { RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './PullToRefresh.css'

/**
 * « Tirer pour actualiser » : en haut de la page, tirer vers le bas puis relâcher recharge les données.
 *
 * L'app installée sur iPhone n'a pas ce geste nativement, et `overscroll-behavior: none` (styles.css)
 * empêche déjà la page de bouger : on peut donc suivre le doigt avec des écouteurs passifs, sans jamais
 * bloquer le défilement. L'indicateur se superpose à la page (pas de décalage du contenu).
 *
 * Le geste est ignoré quand un panneau est ouvert (il se ferme déjà en glissant vers le bas),
 * sur le globe (qu'on fait tourner au doigt) et dès que le mouvement est plutôt horizontal (stories).
 */

/** Distance (après résistance) à dépasser pour déclencher l'actualisation */
const THRESHOLD = 70
/** Distance maximale de l'indicateur */
const MAX_PULL = 110
/** Le doigt parcourt deux fois plus que l'indicateur : effet de résistance */
const RESISTANCE = 0.5
/** Durée minimale d'affichage du chargement, pour que l'actualisation se voie */
const MIN_SPIN_MS = 600
const OFFLINE_MS = 1600

type Phase = 'repos' | 'tirage' | 'chargement' | 'hors-ligne'

const ignoredTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('canvas, .sheet-backdrop, [data-no-pull]'))

export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [phase, setPhase] = useState<Phase>('repos')
  const [pull, setPull] = useState(0)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh

  useEffect(() => {
    let start: { x: number; y: number } | null = null
    let active = false
    let distance = 0
    let busy = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const show = (p: Phase, d: number) => {
      distance = d
      setPhase(p)
      setPull(d)
    }
    const settle = (delay: number) => {
      timer = setTimeout(() => {
        busy = false
        show('repos', 0)
      }, delay)
    }

    const onStart = (e: TouchEvent) => {
      start = null
      active = false
      if (busy || e.touches.length !== 1) return
      if (window.scrollY > 0 || document.body.style.overflow === 'hidden' || ignoredTarget(e.target)) return
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const onMove = (e: TouchEvent) => {
      if (!start || busy) return
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      if (!active) {
        // On attend quelques pixels pour connaître la direction du geste
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
          start = null
          return
        }
        active = true
      }
      show('tirage', Math.max(0, Math.min(MAX_PULL, dy * RESISTANCE)))
    }

    const onEnd = () => {
      const pulled = active ? distance : 0
      start = null
      active = false
      if (pulled === 0) return
      if (pulled < THRESHOLD) return show('repos', 0)

      busy = true
      if (!navigator.onLine) {
        show('hors-ligne', THRESHOLD)
        return settle(OFFLINE_MS)
      }
      show('chargement', THRESHOLD)
      const began = Date.now()
      refresh
        .current()
        .catch(() => {})
        .finally(() => settle(Math.max(0, MIN_SPIN_MS - (Date.now() - began))))
    }

    const onCancel = () => {
      start = null
      active = false
      if (!busy) show('repos', 0)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  const style = { '--pull': `${pull}px`, '--progress': Math.min(1, pull / THRESHOLD) } as CSSProperties

  return (
    <div className={`ptr ptr--${phase}${phase === 'tirage' && pull >= THRESHOLD ? ' ptr--pret' : ''}`} style={style} aria-hidden={phase === 'repos'}>
      <span className="ptr__bubble" role="status" aria-live="polite">
        {phase === 'hors-ligne' ? (
          <>
            <WifiOff size={16} /> <span className="caption">Hors ligne</span>
          </>
        ) : (
          <RefreshCw size={18} className="ptr__icon" aria-label={phase === 'chargement' ? 'Actualisation…' : undefined} />
        )}
      </span>
    </div>
  )
}
