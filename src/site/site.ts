// Site public (accueil et pages légales) : mêmes polices que l'app, embarquées
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/dm-serif-display/400.css'
import '@fontsource/dm-serif-display/400-italic.css'
import './site.css'
import { loadAnalytics } from '../lib/analytics'

loadAnalytics()

/**
 * Apparition des blocs de l'accueil quand ils entrent à l'écran (le haut de page s'anime en CSS seul).
 * Les groupes listés apparaissent l'un après l'autre (--rang). Rien ne bouge si l'utilisateur réduit les animations.
 */
const BLOCS = [
  '.strip__intro',
  '.strip__item',
  '.showcase__head',
  '.feature__copy',
  '.feature__visual',
  '.steps > .kicker, .steps > h2',
  '.steps li',
  '.pricing header',
  '.plan',
  '.faq > .kicker, .faq > h2',
  '.faq details',
  '.manifesto > *',
]

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-visible')
        observer.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  )
  for (const selecteur of BLOCS) {
    document.querySelectorAll<HTMLElement>(selecteur).forEach((el, i) => {
      // Rang dans son groupe (cartes, éléments d'une liste) ; le téléphone d'une section suit son texte
      el.style.setProperty('--rang', String(el.matches('.feature__visual') ? 1 : i % 4))
      el.classList.add('reveal')
      observer.observe(el)
    })
  }
}
