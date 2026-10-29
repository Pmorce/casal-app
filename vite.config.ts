import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
      pwaAssets: { image: 'public/icon.svg', overrideManifestIcons: true },
      manifest: {
        name: 'Casa',
        short_name: 'Casa',
        description: 'Compras, congelador, rotinas e tarefas da casa',
        lang: 'pt-PT',
        display: 'standalone',
        start_url: './',
        scope: './',
        background_color: '#f6f7f6',
        theme_color: '#2a9d63',
      },
    }),
  ],
})
