import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { minimal2023Preset } from '@vite-pwa/assets-generator/config'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Workbox bundles the service worker inside the OS temp dir; a stray package.json there
// (found on a dev PC) breaks module resolution, so on Windows use a project-local temp dir.
if (process.platform === 'win32') {
  const tmp = resolve(__dirname, 'node_modules/.tmp')
  mkdirSync(tmp, { recursive: true })
  process.env.TEMP = process.env.TMP = tmp
}

export default defineConfig({
  // Relative base + HashRouter: works on GitHub Pages whatever the repository name is.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // the bundled fonts must be precached too, or the app opens without them offline
      workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
      // the icon artwork is full-bleed (its own background), so no padding is added around the maskable and Apple icons
      pwaAssets: {
        image: 'public/icon.png',
        overrideManifestIcons: true,
        injectThemeColor: false,
        preset: {
          ...minimal2023Preset,
          maskable: { ...minimal2023Preset.maskable, padding: 0 },
          apple: { ...minimal2023Preset.apple, padding: 0 },
        },
      },
      manifest: {
        name: 'Casa',
        short_name: 'Casa',
        description: 'Compras, congelador, rotinas e tarefas da casa',
        lang: 'pt-PT',
        display: 'standalone',
        start_url: './',
        scope: './',
        background_color: '#FBF6F2',
        theme_color: '#F6D6DC',
      },
    }),
  ],
})
