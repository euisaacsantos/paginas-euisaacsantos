import { getSupabase } from './_supabase.js'

// POST /api/credenciamento
// Registra cada acesso de um lead ao evento ao vivo (gate /credenciamento).
// Cada hit cria uma nova linha — usamos pra contar presença.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'invalid json' })
  }

  const {
    email, phone, source,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid, gclid,
  } = body || {}

  if (!email) return res.status(400).json({ error: 'email obrigatório' })

  const decodeHeader = (v) => {
    if (!v) return null
    const s = Array.isArray(v) ? v[0] : String(v)
    try { return decodeURIComponent(s) } catch { return s }
  }
  const ipRaw = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || ''
  const ip = (Array.isArray(ipRaw) ? ipRaw[0] : ipRaw).toString().split(',')[0].trim() || null
  const user_agent = (req.headers['user-agent'] || '').toString() || null
  const city    = decodeHeader(req.headers['x-vercel-ip-city'])
  const region  = decodeHeader(req.headers['x-vercel-ip-country-region'])
  const country = decodeHeader(req.headers['x-vercel-ip-country'])

  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('cct_credenciamento').insert({
      email,
      phone:  phone  || null,
      source: source || 'form',
      utm_source:   utm_source   || null,
      utm_medium:   utm_medium   || null,
      utm_campaign: utm_campaign || null,
      utm_content:  utm_content  || null,
      utm_term:     utm_term     || null,
      fbclid:       fbclid       || null,
      gclid:        gclid        || null,
      ip, user_agent, city, region, country,
    })
    if (error) {
      console.error('[credenciamento] insert error:', error.message)
      return res.status(500).json({ ok: false, error: error.message })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[credenciamento]', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
