import { getRedis } from './_redis.js'

export default async function handler(req, res) {
  try {
    const r = getRedis()
    const [imersao, mesa] = await Promise.all([
      r.get('imersao:vendas'),
      r.get('mesa:vendas'),
    ])
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10')
    res.status(200).json({
      imersao: parseInt(imersao || '0', 10),
      mesa: parseInt(mesa || '0', 10),
    })
  } catch (err) {
    console.error('[api/vendas-live]', err)
    res.status(500).json({ error: err.message })
  }
}
