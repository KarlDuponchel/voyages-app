import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/dm-serif-display/400.css'
import '@fontsource/dm-serif-display/400-italic.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { AuthProvider } from './data/auth'
import { loadAnalytics } from './lib/analytics'
import { captureInstallPrompt } from './lib/install'
import { ThemeProvider } from './theme/theme'

// Mise à jour automatique : l'app installée sur l'iPhone reste ouverte en arrière-plan,
// on cherche donc une nouvelle version à chaque retour au premier plan. registerSW
// recharge la page dès qu'elle est installée.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {})
    })
  },
})

// Android : la proposition d'installation du navigateur arrive tôt, on la garde pour le message d'accueil
captureInstallPrompt()

loadAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
