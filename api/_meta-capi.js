import crypto from 'node:crypto'

const META_API_VERSION = 'v21.0'

export function sha256(value) {
  if (value === null || value === undefined || value === '') return null
  return crypto.createHash('sha256').update(String(value).toLowerCase().trim()).digest('hex')
}

export function hashArray(value) {
  const h = sha256(value)
  return h ? [h] : undefined
}

export function normalizePhone(phone) {
  if (!phone) return null
  return String(phone).replace(/\D/g, '') || null
}

export function splitName(full) {
  if (!full) return { fn: null, ln: null }
  const parts = String(full).trim().split(/\s+/)
  return {
    fn: parts[0] || null,
    ln: parts.length > 1 ? parts.slice(1).join(' ') : null,
  }
}

/**
 * Envia evento genérico pra Meta CAPI server-side.
 * user_data aceita campos não-hasheados (email/phone/fn/ln/cpf) — função hasha internamente.
 * Campos já prontos em formato Meta: fbp, fbc, client_ip_address, client_user_agent.
 * Campos de geo (city/region/country) são hasheados em array.
 */
export async function sendCapiEvent({
  event_name,
  event_id,
  event_source_url,
  user_data = {},
  custom_data,
}) {
  const pixelId = process.env.META_PIXEL_ID
  const token = process.env.META_ACCESS_TOKEN
  if (!pixelId || !token) {
    return { sent: false, reason: 'META_PIXEL_ID/META_ACCESS_TOKEN ausentes' }
  }

  // Hash campos PII (se não hasheados já)
  const built = {}
  if (user_data.email) built.em = hashArray(user_data.email)
  if (user_data.phone) built.ph = hashArray(normalizePhone(user_data.phone))
  if (user_data.fn) built.fn = hashArray(user_data.fn)
  if (user_data.ln) built.ln = hashArray(user_data.ln)
  if (user_data.external_id) {
    // Aceita array já-hasheado, ou string plain (UUID, CPF, qualquer id).
    // Pra CPF puro (só dígitos), normaliza removendo não-dígitos; pra UUID,
    // hasha a string inteira. Heurística: se só-dígitos, strip; senão, raw.
    if (Array.isArray(user_data.external_id)) {
      built.external_id = user_data.external_id
    } else {
      const raw = String(user_data.external_id).trim()
      const onlyDigits = raw.replace(/\D/g, '')
      // se originalmente era só dígitos (CPF), usa normalizado; senão, usa raw
      const normalized = raw === onlyDigits ? onlyDigits : raw
      built.external_id = hashArray(normalized)
    }
  }
  if (user_data.city) built.ct = hashArray(user_data.city)
  if (user_data.region) built.st = hashArray(user_data.region)
  if (user_data.country) built.country = hashArray(user_data.country)
  if (user_data.zip) built.zp = hashArray(String(user_data.zip).replace(/\D/g, ''))

  // Campos NÃO hasheados
  if (user_data.fbp) built.fbp = user_data.fbp
  if (user_data.fbc) built.fbc = user_data.fbc
  if (user_data.client_ip_address) built.client_ip_address = user_data.client_ip_address
  if (user_data.client_user_agent) built.client_user_agent = user_data.client_user_agent

  const payload = {
    data: [{
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      ...(event_id && { event_id }),
      ...(event_source_url && { event_source_url }),
      action_source: 'website',
      user_data: built,
      ...(custom_data && { custom_data }),
    }],
  }

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { sent: false, status: res.status, error: body }
    }
    return { sent: true, events_received: body.events_received, fbtrace_id: body.fbtrace_id }
  } catch (err) {
    return { sent: false, error: err.message }
  }
}
