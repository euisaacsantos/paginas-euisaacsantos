import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppV1 from './AppV1.jsx'
import AppV2 from './AppV2.jsx'
import AppV3 from './AppV3.jsx'
import AppV4 from './AppV4.jsx'
import AppV5 from './AppV5.jsx'

const path = window.location.pathname
const Root =
  path.startsWith('/v5') ? AppV5 :
  path.startsWith('/v4') ? AppV4 :
  path.startsWith('/v3') ? AppV3 :
  path.startsWith('/v2') ? AppV2 :
  path.startsWith('/v1') ? AppV1 :
  App

// Forward UTMs e demais query params da URL atual para o checkout (Ticto)
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href*="checkout.ticto.app"]')
  if (!a) return
  const search = window.location.search
  if (!search) return
  try {
    const url = new URL(a.href)
    new URLSearchParams(search).forEach((v, k) => url.searchParams.set(k, v))
    e.preventDefault()
    window.open(url.toString(), a.target || '_blank', 'noopener,noreferrer')
  } catch (_) { /* noop */ }
}, true)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
