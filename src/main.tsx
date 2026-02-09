import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force light mode regardless of system preference
if (document.documentElement.classList.contains('dark')) {
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
