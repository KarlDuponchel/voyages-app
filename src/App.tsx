import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PullToRefresh } from './components/PullToRefresh'
import { TabBar } from './components/TabBar'
import { useAuth } from './data/auth'
import { TripsProvider, useTrips } from './data/store'
import { Billet } from './screens/Billet'
import { Connexion } from './screens/Connexion'
import { Imports } from './screens/Imports'
import { Invitation } from './screens/Invitation'
import { Monde } from './screens/Monde'
import { Profil } from './screens/Profil'
import { Souvenirs } from './screens/Souvenirs'
import { Stats } from './screens/Stats'
import { Voyage } from './screens/Voyage'
import { Voyages } from './screens/Voyages'

/** Écrans de détail sans barre d'onglets */
const hideTabBar = (path: string) => path.startsWith('/stats') || path.includes('/reservations/') || path.startsWith('/invitation/')

function Shell() {
  const { pathname } = useLocation()
  const { refresh } = useTrips()
  const { reloadProfile } = useAuth()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <PullToRefresh onRefresh={() => Promise.all([refresh(), reloadProfile()])} />
      <Routes>
        <Route path="/" element={<Monde />} />
        <Route path="/voyages" element={<Voyages />} />
        <Route path="/voyages/:tripId" element={<Voyage />} />
        <Route path="/voyages/:tripId/reservations/:bookingId" element={<Billet />} />
        <Route path="/souvenirs" element={<Souvenirs />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/invitation/:token" element={<Invitation />} />
        <Route path="/imports" element={<Imports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideTabBar(pathname) && <TabBar />}
    </>
  )
}

/** Sans session : écran de connexion (l'adresse est conservée, une invitation reprend après connexion). */
function Gate() {
  const { ready, session } = useAuth()
  if (!ready) return null
  if (!session) return <Connexion />
  return (
    // key : on repart d'un état vierge si un autre compte se connecte
    <TripsProvider userId={session.user.id} key={session.user.id}>
      <Shell />
    </TripsProvider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Gate />
    </BrowserRouter>
  )
}
