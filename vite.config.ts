import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'SIGESIT Sandas PKM Padasuka',
        short_name: 'SIGESIT',
        description: 'Pendataan sanitasi dan kesehatan lingkungan PKM Padasuka.',
        theme_color: '#123f3d',
        background_color: '#f4f7f5',
        display: 'standalone',
        icons: [{ src: '/sigesit-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
