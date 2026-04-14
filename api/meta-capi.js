import { sendCapiEvent } from './_meta-capi.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { event_name, event_id, event_source_url, user_data_client, custom_data } = body

    if (!event_name) {
      return res.status(400).json({ error: 'event_name obrigatório' })
    }

    // IP + UA do header da Vercel (cliente)
    const ipHeader = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || ''
    const ipRaw = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader
    const ip = (ipRaw || '').toString().split(',')[0].trim() || undefined
    const userAgent = (req.headers['user-agent'] || '').toString() || undefined

    // Geo headers Vercel
    const city = req.headers['x-vercel-ip-city']
    const region = req.headers['x-vercel-ip-country-region']
    const country = req.headers['x-vercel-ip-country']

    const user_data = {
      ...(user_data_client?.fbp && { fbp: user_data_client.fbp }),
      ...(user_data_client?.fbc && { fbc: user_data_client.fbc }),
      ...(user_data_client?.external_id && { external_id: user_data_client.external_id }),
      ...(ip && { client_ip_address: ip }),
      ...(userAgent && { client_user_agent: userAgent }),
      ...(city && { city }),
      ...(region && { region }),
      ...(country && { country }),
    }

    const result = await sendCapiEvent({
      event_name,
      event_id,
      event_source_url,
      user_data,
      custom_data,
    })

    if (!result.sent) {
      console.error('[meta-capi]', result)
      return res.status(result.status || 500).json({ error: 'meta api error', details: result.error || result.reason })
    }

    return res.status(200).json({ ok: true, events_received: result.events_received })
  } catch (err) {
    console.error('[meta-capi]', err)
    return res.status(500).json({ error: err.message })
  }
}
