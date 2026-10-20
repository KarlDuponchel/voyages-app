import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Génère les icônes de l'app (iPhone, Android, favicon) à partir de public/logo.svg : `npm run icons`
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0A0F1F' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0A0F1F' } },
  },
  images: ['public/logo.svg'],
})
