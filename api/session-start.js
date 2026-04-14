import { getSupabase } from './_supabase.js'

// Endpoint público (sem auth) — recebe click de CTA pra Ticto e grava sessão.
// Usado pra enriquecer Purchase CAPI no webhook Ticto (lookup por session_id
// propagado via ?src=sess_<uuid> na URL do checkout).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid json' })
  }

  const {
    session_id,
    external_id,
    fbp,
    fbc,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    landing_url,
    content_name,
    value,
  } = body || {}

  if (!session_id) {
    return res.status(400).json({ ok: false, error: 'session_id obrigatório' })
  }
  // precisa de no mínimo fbp ou external_id pra valer a pena gravar
  if (!fbp && !external_id) {
    return res.status(400).json({ ok: false, error: 'fbp ou external_id obrigatório' })
  }

  // Headers Vercel: IP, UA, geo
  const ipHeader = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || ''
  const ipRaw = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader
  const client_ip_address = (ipRaw || '').toString().split(',')[0].trim() || null
  const client_user_agent = (req.headers['user-agent'] || '').toString() || null
  const city = req.headers['x-vercel-ip-city'] || null
  const region = req.headers['x-vercel-ip-country-region'] || null
  const country = req.headers['x-vercel-ip-country'] || null

  try {
    const supabase = getSupabase()

    // Se session_id já existe (retry), não é erro
    const { data: existing } = await supabase
      .from('cct_sessoes_checkout')
      .select('session_id')
      .eq('session_id', session_id)
      .maybeSingle()

    if (existing) {
      return res.status(200).json({ ok: true, session_id, duplicate: true })
    }

    const { error } = await supabase.from('cct_sessoes_checkout').insert({
      session_id,
      external_id: external_id || null,
      fbp: fbp || null,
      fbc: fbc || null,
      client_ip_address,
      client_user_agent,
      city: city ? String(city) : null,
      region: region ? String(region) : null,
      country: country ? String(country) : null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      fbclid: fbclid || null,
      landing_url: landing_url || null,
      content_name: content_name || null,
      value: typeof value === 'number' ? value : null,
    })

    if (error) {
      console.error('[session-start] insert error:', error.message)
      return res.status(500).json({ ok: false, error: error.message })
    }

    return res.status(200).json({ ok: true, session_id })
  } catch (err) {
    console.error('[session-start]', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
