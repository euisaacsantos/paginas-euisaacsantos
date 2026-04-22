import { requireAdmin } from './_auth.js'

const GRAPH = 'https://graph.facebook.com/v20.0'

// POST /api/dashboard/meta-toggle?token=X
// body: { object_id: "123456", status: "ACTIVE" | "PAUSED" }
// Atualiza o status de campanha / conjunto / anúncio via Meta Graph API
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const { object_id, status } = req.body || {}
  if (!object_id || !['ACTIVE', 'PAUSED'].includes(status)) {
    return res.status(400).json({ error: 'object_id e status (ACTIVE|PAUSED) obrigatórios' })
  }

  const accessToken = process.env.META_ADS_ACCESS_TOKEN
  if (!accessToken) return res.status(500).json({ error: 'META_ADS_ACCESS_TOKEN ausente' })

  try {
    const r = await fetch(`${GRAPH}/${object_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ status, access_token: accessToken }),
    })
    const j = await r.json()
    if (!r.ok || j.error) {
      return res.status(502).json({ error: j.error?.message || `Meta API ${r.status}`, detail: j })
    }
    return res.status(200).json({ ok: true, object_id, status })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
