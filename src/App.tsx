import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { Billet } from './screens/Billet'
import { Monde } from './screens/Monde'
import { Profil } from './screens/Profil'
import { Souvenirs } from './screens/Souvenirs'
import { Stats } from './screens/Stats'
import { Voyage } from './screens/Voyage'
import { Voyages } from './screens/Voyages'

/** Écrans de détail sans barre d'onglets */
const hideTabBar = (path: string) => path.startsWith('/stats') || path.includes('/reservations/')

function Shell() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <Routes>
        <Route path="/" element={<Monde />} />
        <Route path="/voyages" element={<Voyages />} />
        <Route path="/voyages/:tripId" element={<Voyage />} />
        <Route path="/voyages/:tripId/reservations/:bookingId" element={<Billet />} />
        <Route path="/souvenirs" element={<Souvenirs />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideTabBar(pathname) && <TabBar />}
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
