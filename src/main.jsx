import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import CommunityDaySingaporeApp from './components/CommunityDaySingaporeApp.jsx'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const rootContent = normalizedPath === '/community-day-singapore' ? <CommunityDaySingaporeApp /> : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {rootContent}
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
