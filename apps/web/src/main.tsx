import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ConnectionBanner from './components/ConnectionBanner/ConnectionBanner.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ConnectionBanner />
  </StrictMode>,
)
