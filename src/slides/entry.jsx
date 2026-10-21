import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Presentation from './main.jsx'

createRoot(document.getElementById('root')).render(<StrictMode><Presentation /></StrictMode>)
