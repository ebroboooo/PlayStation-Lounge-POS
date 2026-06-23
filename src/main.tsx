import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TranslationProvider } from './context/TranslationContext.tsx'
import { RoleProvider } from './context/RoleContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RoleProvider>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </RoleProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('Service Worker registered: ', reg))
      .catch((err) => console.error('Service Worker registration failed: ', err));
  });
}

