import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const BUILD_VERSION = Date.now().toString(36).toUpperCase()

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: `google-fonts-cache-${BUILD_VERSION}`,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: `gstatic-fonts-cache-${BUILD_VERSION}`,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'SIGESIT Sandas PKM Padasuka',
        short_name: 'SIGESIT',
        description: 'Pendataan sanitasi dan kesehatan lingkungan PKM Padasuka.',
        theme_color: '#123f3d',
        background_color: '#f4f7f5',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/sigesit-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/sigesit-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ],
      },
    }),
  ],
})