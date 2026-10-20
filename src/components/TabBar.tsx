import { Camera, Globe2, Plane, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import './TabBar.css'

const tabs = [
  { to: '/', label: 'Monde', Icon: Globe2, end: true },
  { to: '/voyages', label: 'Voyages', Icon: Plane, end: false },
  { to: '/souvenirs', label: 'Souvenirs', Icon: Camera, end: false },
  { to: '/profil', label: 'Profil', Icon: User, end: false },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="tabbar__item">
          <Icon size={24} strokeWidth={2} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
