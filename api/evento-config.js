import { getRedis } from './_redis.js'

// GET /api/evento-config — público (sem auth)
// Retorna URLs do Zoom (credenciamento) e do checkout Ticto da Mentoria.
// Editável sem deploy via Redis Desktop:
//   evento:zoom_url           (string — URL do Zoom da imersão)
//   mentoria:checkout_url     (string — URL do checkout Ticto da Mentoria)
export default async function handler(req, res) {
  try {
    const r = getRedis()
    const [zoomUrl, mentoriaCheckoutUrl] = await Promise.all([
      r.get('evento:zoom_url'),
      r.get('mentoria:checkout_url'),
    ])
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    res.status(200).json({
      zoom_url:              zoomUrl              || null,
      mentoria_checkout_url: mentoriaCheckoutUrl  || null,
    })
  } catch (err) {
    console.error('[evento-config]', err)
    res.status(500).json({ error: err.message })
  }
}
