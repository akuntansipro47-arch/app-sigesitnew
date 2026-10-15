import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TranslationProvider } from './i18n/context'
import './index.css'
import App from './App.tsx'

// Daftarkan service worker (precache + auto-update) — hanya di build produksi.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('Gagal mendaftarkan service worker:', err)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </StrictMode>,
)
