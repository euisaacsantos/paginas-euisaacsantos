import { requireAdmin } from './_auth.js'

const GRAPH = 'https://graph.facebook.com/v21.0'

// PUT /api/dashboard/meta-ads-budget?token=X
// body: { id, budget_type: 'daily' | 'lifetime', amount }  — amount em BRL (não centavos)
export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireAdmin(req, res)) return

  const metaToken = process.env.META_ADS_ACCESS_TOKEN
  if (!metaToken) return res.status(500).json({ error: 'META_ADS_ACCESS_TOKEN ausente' })

  const { id, budget_type, amount } = req.body || {}
  if (!id || !amount) return res.status(400).json({ error: 'id e amount são obrigatórios' })

  // Meta espera centavos (menor unidade do BRL)
  const amountCents = String(Math.round(Number(amount) * 100))
  const field = budget_type === 'lifetime' ? 'lifetime_budget' : 'daily_budget'

  const body = new URLSearchParams({ [field]: amountCents, access_token: metaToken })

  const r = await fetch(`${GRAPH}/${id}`, { method: 'POST', body })
  const j = await r.json()

  if (!r.ok) return res.status(502).json({ error: j.error?.message || 'Meta error', details: j })
  return res.status(200).json({ success: true })
}
