import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { trackPageView, sendCAPI } from './lib/meta-tracking.js'

// Lazy: cada rota gera chunk separado — só o chunk ativo é baixado pelo visitante
const path = window.location.pathname
const Root =
  path.startsWith('/admin')          ? lazy(() => import('./AppAdmin.jsx')) :
  path.startsWith('/credenciamento') ? lazy(() => import('./AppCredenciamento.jsx')) :
  path.startsWith('/checkout')       ? lazy(() => import('./AppCheckout.jsx')) :
  path.startsWith('/confirmado')     ? lazy(() => import('./AppConfirmado.jsx')) :
  path.startsWith('/obrigado')       ? lazy(() => import('./AppObrigado.jsx')) :
  path.startsWith('/v3')             ? lazy(() => import('./AppV3.jsx')) :
  path.startsWith('/v2')             ? lazy(() => import('./AppV2.jsx')) :
  path.startsWith('/v1')             ? lazy(() => import('./AppV1.jsx')) :
                                       lazy(() => import('./App.jsx'))

// Tracking ponta-a-ponta:
// 1. PageView já gera external_id (UUID persistente em localStorage)
// 2. No click do CTA Ticto: gera session_id único, POST /api/session-start
//    (grava fbp/fbc/utms/ip/ua/geo no Supabase), e propaga ?src=sess_<uuid>
//    pro checkout. O webhook Ticto usa esse session_id pra fazer lookup
//    e enriquecer o Purchase CAPI.
function cctGetCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}
function cctGetExternalId() {
  try {
    let id = localStorage.getItem('cct_ext_id')
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
           ('ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11))
      localStorage.setItem('cct_ext_id', id)
    }
    return id
  } catch {
    return null
  }
}
function cctBuildFbc() {
  try {
    const fbclid = new URL(window.location.href).searchParams.get('fbclid')
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null
  } catch {
    return null
  }
}
function cctParseUtms() {
  try {
    const p = new URLSearchParams(window.location.search)
    return {
      utm_source: p.get('utm_source') || null,
      utm_medium: p.get('utm_medium') || null,
      utm_campaign: p.get('utm_campaign') || null,
      utm_content: p.get('utm_content') || null,
      utm_term: p.get('utm_term') || null,
      fbclid: p.get('fbclid') || null,
    }
  } catch {
    return {}
  }
}

document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href*="checkout.ticto.app"]')
  if (!a) return
  try {
    const sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
      ('sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11))
    const externalId = cctGetExternalId()
    const fbp = cctGetCookie('_fbp') || null
    const fbc = cctGetCookie('_fbc') || cctBuildFbc()
    const utms = cctParseUtms()

    // Valor e nome do produto lidos do data-attribute do link CTA
    const value       = parseFloat(a.dataset.value)   || undefined
    const contentName = a.dataset.contentName         || undefined

    // event_id compartilhado entre Pixel (client) e CAPI (server via session-start)
    // garante que Meta deduplique e conte um único InitiateCheckout
    const eventId = 'ick_' + sessionId

    // ── InitiateCheckout: client (Pixel) + server (CAPI via /api/meta-capi) ──
    sendCAPI('InitiateCheckout', {
      currency: 'BRL',
      ...(value       && { value }),
      ...(contentName && { content_name: contentName }),
      num_items: 1,
    }, eventId)

    // ── Sessão: grava fbp/fbc/UTMs/geo no Supabase pra enriquecer Purchase CAPI ──
    // Passa event_id e dados do produto pra session-start também disparar InitiateCheckout
    // server-side com IP/UA/geo reais (deduplicado pelo mesmo event_id)
    fetch('/api/session-start', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        external_id: externalId,
        fbp,
        fbc,
        ...utms,
        landing_url: window.location.href,
        event_id: eventId,
        ...(value       && { value }),
        ...(contentName && { content_name: contentName }),
      }),
    }).catch(() => {})

    // monta URL Ticto: mantém UTMs originais + sobrescreve src com session_id
    const url = new URL(a.href)
    const search = window.location.search
    if (search) {
      new URLSearchParams(search).forEach((v, k) => url.searchParams.set(k, v))
    }
    url.searchParams.set('src', `sess_${sessionId}`)

    e.preventDefault()
    window.open(url.toString(), a.target || '_blank', 'noopener,noreferrer')
  } catch (_) { /* noop */ }
}, true)

// garante que external_id já existe antes do primeiro PageView
cctGetExternalId()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
)

// PageView Meta Ads (Pixel client + CAPI server, dedup via event_id)
trackPageView()
