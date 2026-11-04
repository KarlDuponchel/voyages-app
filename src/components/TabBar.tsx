import { Camera, Compass, Globe2, Plane, User } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import './TabBar.css'

const tabs = [
  { to: '/monde', label: 'Monde', Icon: Globe2, end: true },
  { to: '/voyages', label: 'Voyages', Icon: Plane, end: false },
  { to: '/souvenirs', label: 'Souvenirs', Icon: Camera, end: false },
  { to: '/explorer', label: 'Explorer', Icon: Compass, end: false },
  { to: '/profil', label: 'Profil', Icon: User, end: false },
]

/** Écart de défilement (px) avant de changer d'état, pour ignorer les petits mouvements du doigt */
const SEUIL = 8
/** Glissement horizontal (px) sur la barre avant de suivre le doigt d'onglet en onglet */
const DRAG_START = 10

/**
 * Barre réduite pendant qu'on fait défiler vers le bas (plus de place pour le contenu),
 * remise en grand dès qu'on remonte ou qu'on revient en haut de page.
 */
function useCompact() {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        if (y < 40) setCompact(false)
        else if (y - last > SEUIL) setCompact(true)
        else if (last - y > SEUIL) setCompact(false)
        else return
        last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return compact
}

/** Onglet de la page affichée (-1 hors onglets, ex. « E-mails à valider ») */
const tabIndex = (path: string) => tabs.findIndex((t) => (t.end ? path === t.to : path === t.to || path.startsWith(`${t.to}/`)))

/**
 * Change d'onglet avec une transition d'écran (View Transitions : Safari 18+, Chrome) : l'ancien écran glisse
 * vers la gauche ou la droite selon le sens, et la pastille de l'onglet actif passe d'un onglet à l'autre.
 * Sans cette API, ou si l'on réduit les animations, le changement est immédiat (la pastille glisse en CSS).
 */
function useTabNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (to: string) => {
    const from = tabIndex(pathname)
    const target = tabIndex(to)
    const root = document.documentElement
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce || from === target) {
      navigate(to)
      return
    }
    root.dataset.tabDirection = from < 0 || target > from ? 'avant' : 'arriere'
    const transition = document.startViewTransition(() => flushSync(() => navigate(to)))
    transition.finished.finally(() => delete root.dataset.tabDirection)
  }
}

export function TabBar() {
  const compact = useCompact()
  const { pathname } = useLocation()
  const go = useTabNavigate()
  const nav = useRef<HTMLElement>(null)
  // Doigt qui glisse sur la barre : la pastille le suit, l'onglet change au lâcher
  const drag = useRef<{ x: number; active: boolean } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const justDragged = useRef(false)

  // Les boutons flottants (« Nouveau voyage »…) descendent avec la barre réduite
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('tabbar-reduite', compact)
    return () => root.classList.remove('tabbar-reduite')
  }, [compact])

  const current = tabIndex(pathname)
  const shown = hover ?? current

  const indexAt = (clientX: number) => {
    const rect = nav.current?.getBoundingClientRect()
    if (!rect) return current
    return Math.min(tabs.length - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * tabs.length)))
  }

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, active: false }
  }
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.active) {
      if (Math.abs(e.clientX - d.x) < DRAG_START) return
      d.active = true
      // Le doigt peut sortir d'un onglet sans perdre le glissement
      try {
        nav.current?.setPointerCapture(e.pointerId)
      } catch {
        // pointeur déjà relâché : sans importance
      }
    }
    const i = indexAt(e.clientX)
    if (i !== hover) {
      navigator.vibrate?.(5)
      setHover(i)
    }
  }
  const onPointerEnd = () => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    // Le clic qui suit éventuellement le lâcher ne doit pas rechanger d'onglet
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 300)
    const target = hover
    setHover(null)
    if (target !== null && target !== current) go(tabs[target].to)
  }
  const onLinkClick = (e: MouseEvent, to: string) => {
    e.preventDefault()
    // Le lâcher d'un glissement a déjà changé d'onglet
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    go(to)
  }

  return (
    <nav
      ref={nav}
      className={`tabbar${compact ? ' tabbar--compact' : ''}${hover !== null ? ' tabbar--dragging' : ''}`}
      aria-label="Navigation principale"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {/* Pastille de l'onglet actif : elle glisse d'un onglet à l'autre */}
      <span className="tabbar__indicator" style={{ '--tab': Math.max(0, shown) } as CSSProperties} data-hidden={shown < 0} aria-hidden />
      {tabs.map(({ to, label, Icon, end }, i) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={`tabbar__item${i === shown ? ' is-shown' : ''}`}
          aria-label={label}
          onClick={(e) => onLinkClick(e, to)}
          draggable={false}
        >
          <Icon size={21} strokeWidth={1.9} aria-hidden />
          <span aria-hidden>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
