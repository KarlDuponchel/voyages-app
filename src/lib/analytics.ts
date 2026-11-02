/**
 * Mesure d'audience avec Umami, installé sur le même Dokploy (sans cookie, rien ne suit une personne d'une visite à l'autre).
 * Inactive tant que VITE_UMAMI_SRC (adresse du script, ex. https://stats.tripmates.app/script.js)
 * et VITE_UMAMI_WEBSITE_ID ne sont pas renseignés. Voir docs/hebergement.md.
 */
export function loadAnalytics(): void {
  const src = import.meta.env.VITE_UMAMI_SRC
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
  if (!src || !websiteId || import.meta.env.DEV) return
  const script = document.createElement('script')
  script.defer = true
  script.src = src
  script.dataset.websiteId = websiteId
  document.head.appendChild(script)
}
