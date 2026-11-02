import { Camera, Compass, Globe2, Plane, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
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

export function TabBar() {
  const compact = useCompact()
  return (
    <nav className={`tabbar${compact ? ' tabbar--compact' : ''}`} aria-label="Navigation principale">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="tabbar__item" aria-label={label}>
          <Icon size={21} strokeWidth={1.9} aria-hidden />
          <span aria-hidden>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
