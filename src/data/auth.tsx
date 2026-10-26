import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearFileCache } from '../lib/files'
import { disablePush } from '../lib/push'
import { supabase } from '../lib/supabase'
import type { TablesUpdate } from './database.types'
import type { Profile } from './types'

/**
 * Connexion par e-mail : on reçoit un code (6 à 10 chiffres selon le réglage « Email OTP Length » de Supabase) (et un lien magique).
 * Le code est indispensable sur iPhone : l'app installée sur l'écran d'accueil ne partage pas
 * sa session avec Safari, donc un lien ouvert depuis Mail connecterait Safari, pas l'app.
 */

const PROFILE_CACHE = 'voyages:profile:v1'

type ProfileRow = { id: string; display_name: string; home_city: string | null; home_lat: number | null; home_lng: number | null }

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  displayName: r.display_name,
  homeCity: r.home_city ?? undefined,
  homeLat: r.home_lat ?? undefined,
  homeLng: r.home_lng ?? undefined,
})

function cachedProfile(userId: string): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_CACHE) ?? 'null') as Profile | null
    return p?.id === userId ? p : null
  } catch {
    return null
  }
}

export type ProfilePatch = Partial<Pick<Profile, 'displayName' | 'homeCity' | 'homeLat' | 'homeLng'>>

type AuthContextValue = {
  /** false tant que la session enregistrée n'a pas été relue */
  ready: boolean
  session: Session | null
  profile: Profile | null
  /** Relit le profil sur le serveur (ex. tirer pour actualiser) */
  reloadProfile: () => Promise<void>
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('profiles').select('id, display_name, home_city, home_lat, home_lng').eq('id', userId).single()
    if (error || !data) return // hors ligne : on garde le profil en cache
    const p = toProfile(data as ProfileRow)
    setProfile(p)
    try {
      localStorage.setItem(PROFILE_CACHE, JSON.stringify(p))
    } catch {
      // stockage indisponible
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    setProfile(cachedProfile(userId))
    loadProfile()
  }, [userId, loadProfile])

  const value: AuthContextValue = {
    ready,
    session,
    profile,
    reloadProfile: loadProfile,
    sendCode: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        // Le lien magique ramène à la page en cours (utile pour une invitation)
        options: { shouldCreateUser: true, emailRedirectTo: window.location.href },
      })
      if (error) throw error
    },
    verifyCode: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) throw error
    },
    signOut: async () => {
      // Ce téléphone ne doit plus recevoir les notifications du compte (à faire avant de perdre la session)
      await disablePush().catch(() => {})
      await supabase.auth.signOut()
      localStorage.removeItem(PROFILE_CACHE)
      await clearFileCache()
    },
    updateProfile: async (patch) => {
      if (!userId) return
      const row: TablesUpdate<'profiles'> = {}
      if (patch.displayName !== undefined) row.display_name = patch.displayName
      if (patch.homeCity !== undefined) row.home_city = patch.homeCity
      if (patch.homeLat !== undefined) row.home_lat = patch.homeLat
      if (patch.homeLng !== undefined) row.home_lng = patch.homeLng
      const { error } = await supabase.from('profiles').update(row).eq('id', userId)
      if (error) throw error
      await loadProfile()
    },
    deleteAccount: async () => {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await supabase.auth.signOut()
      localStorage.clear()
      await clearFileCache()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
