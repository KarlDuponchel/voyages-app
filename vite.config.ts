import { resolve } from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Pages statiques du site public, servies sans « .html » (/cgv → cgv.html) */
const SITE_PAGES = ['cgv', 'mentions-legales', 'confidentialite']

/**
 * « / » est la page d'accueil publique (index.html), les pages légales sont à part,
 * et toutes les autres adresses sont celles de l'app (app.html). Même règle que vercel.json,
 * pour le serveur de développement et `vite preview`.
 */
function sitePages(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = (req.url ?? '/').split('?')[0]
    const query = (req.url ?? '').slice(path.length)
    if (req.method === 'GET' && path !== '/' && !path.includes('.') && !path.startsWith('/@') && !path.startsWith('/__')) {
      const page = path.slice(1)
      req.url = (SITE_PAGES.includes(page) ? `/${page}.html` : '/app.html') + query
    }
    next()
  }
  return {
    name: 'site-pages',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(['index', 'app', ...SITE_PAGES].map((name) => [name, resolve(__dirname, `${name}.html`)])),
      // Nom fixe pour l'exclure du cache hors ligne (voir workbox.globIgnores)
      output: { manualChunks: { mediabunny: ['mediabunny'] } },
    },
  },
  plugins: [
    sitePages(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // enregistré dans src/main.tsx (avec la vérification au retour dans l'app)
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Tripmates',
        short_name: 'Tripmates',
        description: 'Nos voyages, billets et souvenirs au même endroit.',
        lang: 'fr',
        start_url: '/monde',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F3E9',
        theme_color: '#F7F3E9',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout le site (y compris polices et lecteur de PDF) est mis en cache : l'app marche hors ligne.
        // Les billets eux-mêmes sont copiés à part (src/lib/files.ts).
        // pdf.js (worker en .mjs, 1,4 Mo) : on relève la limite par défaut de 2 Mo par fichier par sécurité
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,woff,woff2,otf,ttf,json}'],
        // Réception des notifications et ouverture de la bonne page au toucher (public/push-sw.js)
        importScripts: ['/push-sw.js'],
        // Hors ligne, les adresses de l'app s'ouvrent sur app.html (« / » et les pages légales sont en cache à part)
        navigateFallback: '/app.html',
        // Compression vidéo (Mediabunny, 740 Ko) : chargée seulement pour envoyer une vidéo, donc avec du réseau
        globIgnores: ['**/mediabunny-*.js'],
      },
    }),
  ],
})
