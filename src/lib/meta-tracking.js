// Meta Ads tracking — disparo duplo (Pixel client + CAPI server) com dedup via event_id.
// O pixel é inicializado inline no <head> do index.html. Este módulo dispara eventos.

const CAPI_ENDPOINT = '/api/meta-capi'

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function buildFbcFromUrl() {
  try {
    const fbclid = new URL(window.location.href).searchParams.get('fbclid')
    if (!fbclid) return null
    return `fb.1.${Date.now()}.${fbclid}`
  } catch {
    return null
  }
}

function newEventId() {
  return 'eid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// External ID estável por visitante (UUID em localStorage).
// Mesma chave usada em main.jsx ao montar sessão de checkout — garante
// que Meta amarra PageView/AddToCart/Contact/Purchase no mesmo usuário.
export function getExternalId() {
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

/**
 * Dispara evento Meta Ads em client (Pixel) + server (CAPI) simultaneamente.
 * Mesmo event_id nos dois lados garante dedup no Events Manager.
 */
export function sendCAPI(eventName, customData) {
  try {
    const eventId = newEventId()
    const fbp = getCookie('_fbp')
    const fbc = getCookie('_fbc') || buildFbcFromUrl()
    const externalId = getExternalId()

    // Client Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, customData || {}, { eventID: eventId })
    }

    // Server CAPI
    fetch(CAPI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data_client: {
          ...(fbp && { fbp }),
          ...(fbc && { fbc }),
          ...(externalId && { external_id: externalId }),
        },
        ...(customData && { custom_data: customData }),
      }),
      keepalive: true,
    }).catch(() => { /* silencioso */ })
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[sendCAPI]', err && err.message)
    }
  }
}

export function trackPageView() {
  sendCAPI('PageView')
}

export function trackAddToCart({ content_name, value } = {}) {
  sendCAPI('AddToCart', {
    currency: 'BRL',
    ...(content_name && { content_name }),
    ...(typeof value === 'number' && { value }),
  })
}

export function trackContact(contentName) {
  sendCAPI('Contact', {
    content_name: contentName || 'Suporte WhatsApp',
  })
}
