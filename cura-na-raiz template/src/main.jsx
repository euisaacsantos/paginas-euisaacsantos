import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppV1 from './AppV1.jsx'

const isV1 = window.location.pathname.startsWith('/v1')
const Root = isV1 ? AppV1 : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
