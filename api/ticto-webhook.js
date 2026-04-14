import { getRedis } from './_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = req.query.token
  if (!process.env.TICTO_WEBHOOK_SECRET || token !== process.env.TICTO_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    const status = (body.status || body.order_status || '').toString().toLowerCase()
    const validStatuses = ['approved', 'paid', 'authorized', 'aprovado', 'pago']
    if (status && !validStatuses.includes(status)) {
      return res.status(200).json({ ignored: true, reason: `status=${status}` })
    }

    const offerCode =
      body.offer_code ||
      body.offer?.code ||
      body.product?.offer_code ||
      body.transaction?.offer_code ||
      (body.checkout_url && String(body.checkout_url).split('/').pop()) ||
      null

    if (!offerCode) {
      return res.status(400).json({ error: 'offer_code ausente no payload', body })
    }

    const r = getRedis()
    const [imersaoConfigStr, mesaConfigStr] = await Promise.all([
      r.get('imersao:config'),
      r.get('mesa:config'),
    ])
    const lotes = JSON.parse(imersaoConfigStr || '[]')
    const mesaConfig = JSON.parse(mesaConfigStr || '{}')

    const loteMatch = lotes.find((l) => l.offer_code === offerCode)
    if (loteMatch) {
      const newValue = await r.incr('imersao:vendas')
      return res.status(200).json({ ok: true, kind: 'imersao', lote: loteMatch.id, vendas: newValue })
    }

    if (mesaConfig.offer_code && mesaConfig.offer_code === offerCode) {
      const newValue = await r.incr('mesa:vendas')
      return res.status(200).json({ ok: true, kind: 'mesa', vendas: newValue })
    }

    return res.status(200).json({ ignored: true, reason: `offer_code desconhecido: ${offerCode}` })
  } catch (err) {
    console.error('[api/ticto-webhook]', err)
    res.status(500).json({ error: err.message })
  }
}
