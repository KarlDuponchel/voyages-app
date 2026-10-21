import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { gradients, palettes, type Palette, type PaletteName } from './palettes'

export type ThemeChoice = 'auto' | PaletteName

const STORAGE_KEY = 'voyages:theme'

/** bgBase → --bg-base */
const toCssVar = (key: string) => '--' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

function applyPalette(name: PaletteName) {
  const root = document.documentElement
  const palette: Palette = palettes[name]
  for (const [key, value] of Object.entries(palette)) root.style.setProperty(toCssVar(key), value)
  for (const [key, value] of Object.entries(gradients)) root.style.setProperty('--gradient-' + key, value)
  root.dataset.theme = name
  root.style.colorScheme = name === 'clair' ? 'light' : 'dark'
  setThemeColor(palette.bgBase)
}

const setThemeColor = (color: string) => document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'auto' || saved === 'sombre' || saved === 'clair') return saved
  } catch {
    // stockage indisponible (navigation privée…) : on reste en auto
  }
  return 'auto'
}

const systemPrefersLight = () => window.matchMedia('(prefers-color-scheme: light)').matches

type ThemeContextValue = { choice: ThemeChoice; active: PaletteName; setChoice: (c: ThemeChoice) => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice)
  const [systemLight, setSystemLight] = useState(systemPrefersLight)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSystemLight(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const active: PaletteName = choice === 'auto' ? (systemLight ? 'clair' : 'sombre') : choice

  // Avant le premier affichage, pour éviter un flash de la mauvaise palette
  useLayoutEffect(() => {
    applyPalette(active)
  }, [active])

  const setChoice = (c: ThemeChoice) => {
    setChoiceState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {
      // ignoré : le choix vaut pour la session
    }
  }

  return <ThemeContext.Provider value={{ choice, active, setChoice }}>{children}</ThemeContext.Provider>
}

/**
 * Couleur de la barre d'état pendant l'affichage d'un écran (ex. le haut de la couverture d'un voyage).
 * Depuis iOS 26, l'app installée floute le haut de l'écran avec cette couleur : avec la couleur de fond
 * par défaut, on obtenait un voile clair sur les images. On revient à la couleur du thème en quittant l'écran.
 */
export function useStatusBarColor(color: string | undefined) {
  const { active } = useTheme()
  useLayoutEffect(() => {
    if (!color) return
    setThemeColor(color)
    return () => setThemeColor(palettes[active].bgBase)
  }, [color, active])
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return ctx
}
