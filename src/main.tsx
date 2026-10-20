import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource-variable/bricolage-grotesque'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { TripsProvider } from './data/store'
import { ThemeProvider } from './theme/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TripsProvider>
        <App />
      </TripsProvider>
    </ThemeProvider>
  </StrictMode>,
)
