import crypto from 'node:crypto'

const META_API_VERSION = 'v21.0'

function sha256(value) {
  if (value === null || value === undefined || value === '') return null
  return crypto.createHash('sha256').update(String(value).toLowerCase().trim()).digest('hex')
}

function hashArray(value) {
  const h = sha256(value)
  return h ? [h] : undefined
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const pixelId = process.env.META_PIXEL_ID
  const token = process.env.META_ACCESS_TOKEN

  if (!pixelId || !token) {
    return res.status(500).json({ error: 'META_PIXEL_ID ou META_ACCESS_TOKEN ausentes' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { event_name, event_id, event_source_url, user_data_client, custom_data } = body

    if (!event_name) {
      return res.status(400).json({ error: 'event_name obrigatório' })
    }

    // IP (texto puro — Meta espera não-hasheado)
    const ipHeader = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || ''
    const ipRaw = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader
    const ip = (ipRaw || '').toString().split(',')[0].trim() || undefined
    const userAgent = (req.headers['user-agent'] || '').toString() || undefined

    // Geo (HASHEADO sha256, lowercase, trim — arrays)
    const city = req.headers['x-vercel-ip-city']
    const region = req.headers['x-vercel-ip-country-region']
    const country = req.headers['x-vercel-ip-country']

    const user_data = {
      ...(ip && { client_ip_address: ip }),
      ...(userAgent && { client_user_agent: userAgent }),
      ...(user_data_client?.fbp && { fbp: user_data_client.fbp }),
      ...(user_data_client?.fbc && { fbc: user_data_client.fbc }),
      ...(city && { ct: hashArray(city) }),
      ...(region && { st: hashArray(region) }),
      ...(country && { country: hashArray(country) }),
    }

    const payload = {
      data: [{
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        ...(event_id && { event_id }),
        ...(event_source_url && { event_source_url }),
        action_source: 'website',
        user_data,
        ...(custom_data && { custom_data }),
      }],
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const metaData = await metaRes.json()
    if (!metaRes.ok) {
      console.error('[meta-capi] erro Meta', metaData)
      return res.status(metaRes.status).json({ error: 'meta api error', details: metaData })
    }

    return res.status(200).json({ ok: true, events_received: metaData.events_received })
  } catch (err) {
    console.error('[meta-capi]', err)
    return res.status(500).json({ error: err.message })
  }
}
