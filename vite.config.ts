import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // enregistré dans src/main.tsx (avec la vérification au retour dans l'app)
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'fonts/*'],
      manifest: {
        name: 'Voyages',
        short_name: 'Voyages',
        description: 'Nos voyages, billets et souvenirs au même endroit.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0F1F',
        theme_color: '#0A0F1F',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout le site (y compris billets et polices) est mis en cache : l'app marche hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,otf,ttf,json}'],
      },
    }),
  ],
})
