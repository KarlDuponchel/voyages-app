import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'
import { gradients, palettes, type Palette, type PaletteName } from './palettes'

/**
 * Thème clair uniquement : le thème sombre est désactivé (choix de Karl, 02/11).
 * Pour le réactiver, remettre un choix Auto / Clair / Sombre (voir l'historique Git de ce fichier).
 */
const ACTIVE: PaletteName = 'clair'

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

type ThemeContextValue = { active: PaletteName }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Avant le premier affichage, pour éviter un flash de la mauvaise palette
  useLayoutEffect(() => {
    applyPalette(ACTIVE)
  }, [])

  return <ThemeContext.Provider value={{ active: ACTIVE }}>{children}</ThemeContext.Provider>
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
