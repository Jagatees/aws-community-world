import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import CommunityDaySingaporeRoute from './components/CommunityDaySingaporeRoute.jsx'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const Presentation = lazy(() => import('./slides/main.jsx'))
const rootContent = normalizedPath === '/slides'
  ? <Suspense fallback={<p role="status">Loading slides…</p>}><Presentation /></Suspense>
  : normalizedPath === '/community-day-singapore'
  ? <CommunityDaySingaporeRoute />
  : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {rootContent}
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
