// Persistência de lead em localStorage com TTL de 3 dias.
// Compartilhado por /credenciamento e /checkout.

const KEY = 'cct_lead_data'
const TTL_MS = 3 * 24 * 60 * 60 * 1000

export function getLeadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data.email || !data.phone) return null
    if (data.saved_at && Date.now() - data.saved_at > TTL_MS) {
      localStorage.removeItem(KEY)
      return null
    }
    return { email: data.email, phone: data.phone, name: data.name || '' }
  } catch {
    return null
  }
}

export function saveLeadData({ email, phone, name }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, phone, name: name || '', saved_at: Date.now() }))
  } catch { /* noop */ }
}

export function getUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search)
    const out = {}
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']) {
      const v = params.get(k)
      if (v) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

// Beacon com fallback fetch keepalive. Usado pra não bloquear navegação.
export function sendBeacon(endpoint, payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  try {
    const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
    if (ok) return
  } catch { /* noop */ }
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

// Monta URL final com email/phone/name + UTMs como query params.
// Usa nomes genéricos: o gateway (Ticto/Hotmart/etc) consome o que entender.
export function buildRedirectUrl(baseUrl, { email, phone, name } = {}) {
  if (!baseUrl) return null
  let url
  try { url = new URL(baseUrl) } catch { return baseUrl }

  if (email) url.searchParams.set('email', email)
  if (name)  url.searchParams.set('name',  name)

  const phoneDigits = (phone || '').replace(/\D/g, '')
  if (phoneDigits.startsWith('55') && phoneDigits.length >= 12) {
    const national = phoneDigits.slice(2)
    url.searchParams.set('phoneac',     national.slice(0, 2))
    url.searchParams.set('phonenumber', national.slice(2))
  } else if (phoneDigits.length >= 8) {
    url.searchParams.set('phonenumber', phoneDigits)
  }

  // Propaga UTMs da URL atual + fbclid (não sobrescreve se já vieram do baseUrl)
  const current = new URLSearchParams(window.location.search)
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid']) {
    const v = current.get(key)
    if (v && !url.searchParams.has(key)) url.searchParams.set(key, v)
  }

  // sck no padrão Hotmart/Ticto: utm_x:valor|utm_y:valor (alguns gateways usam pra tracking interno)
  const sck = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
    .filter((k) => current.get(k))
    .map((k) => `${k}:${current.get(k)}`)
    .join('|')
  if (sck && !url.searchParams.has('sck')) url.searchParams.set('sck', sck)

  return url.toString()
}
