import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppV1 from './AppV1.jsx'
import AppV2 from './AppV2.jsx'
import AppObrigado from './AppObrigado.jsx'
import AppConfirmado from './AppConfirmado.jsx'
import { trackPageView } from './lib/meta-tracking.js'

const path = window.location.pathname
const Root =
  path.startsWith('/confirmado') ? AppConfirmado :
  path.startsWith('/obrigado') ? AppObrigado :
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

// PageView Meta Ads (Pixel client + CAPI server, dedup via event_id)
trackPageView()
