import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TranslationProvider } from './i18n/context'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </StrictMode>,
)
