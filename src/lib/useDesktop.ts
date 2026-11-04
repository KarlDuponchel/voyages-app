import { useEffect, useState } from 'react'

/** Largeur à partir de laquelle l'app passe en version ordinateur (même valeur que src/desktop.css) */
export const DESKTOP_QUERY = '(min-width: 1024px)'

/** Vrai sur un grand écran ; suit les redimensionnements de la fenêtre */
export function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setDesktop(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return desktop
}
