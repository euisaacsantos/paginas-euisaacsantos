import { getRedis } from './_redis.js'

// Endpoint admin pra ajustes manuais.
// Uso:
//   GET /api/admin?token=XXX&action=get
//   POST /api/admin?token=XXX&action=incr&key=imersao:vendas&by=1
//   POST /api/admin?token=XXX&action=set&key=mesa:vendas&value=5

export default async function handler(req, res) {
  const token = req.query.token
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const action = req.query.action || 'get'
  const r = getRedis()

  try {
    if (action === 'get') {
      const [vendas, mesa, imersaoConfig, mesaConfig] = await Promise.all([
        r.get('imersao:vendas'),
        r.get('mesa:vendas'),
        r.get('imersao:config'),
        r.get('mesa:config'),
      ])
      return res.status(200).json({
        vendas: parseInt(vendas || '0', 10),
        mesa_vendas: parseInt(mesa || '0', 10),
        imersao_config: JSON.parse(imersaoConfig || '[]'),
        mesa_config: JSON.parse(mesaConfig || '{}'),
      })
    }

    if (action === 'incr') {
      const key = req.query.key
      const by = parseInt(req.query.by || '1', 10)
      if (!key) return res.status(400).json({ error: 'key obrigatória' })
      const newValue = await r.incrby(key, by)
      return res.status(200).json({ key, value: newValue })
    }

    if (action === 'set') {
      const key = req.query.key
      const value = req.query.value
      if (!key || value === undefined) return res.status(400).json({ error: 'key e value obrigatórios' })
      await r.set(key, value)
      return res.status(200).json({ key, value })
    }

    return res.status(400).json({ error: `action desconhecida: ${action}` })
  } catch (err) {
    console.error('[api/admin]', err)
    res.status(500).json({ error: err.message })
  }
}
