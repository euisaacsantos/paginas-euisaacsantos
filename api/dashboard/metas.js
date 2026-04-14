import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/metas?token=X   → lista metas
// PUT /api/dashboard/metas?token=X   body: { chave, valor }  → upsert
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  const supabase = getSupabase()

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('cct_metas')
        .select('*')
        .order('chave', { ascending: true })
      if (error) throw error
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ metas: data || [] })
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { chave, valor } = body
      if (!chave || typeof chave !== 'string') {
        return res.status(400).json({ error: 'chave obrigatória' })
      }
      const n = Number(valor)
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: 'valor inválido' })
      }
      const { data, error } = await supabase
        .from('cct_metas')
        .upsert({ chave, valor: n, updated_at: new Date().toISOString() }, { onConflict: 'chave' })
        .select()
        .maybeSingle()
      if (error) throw error
      return res.status(200).json({ ok: true, meta: data })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    console.error('[api/dashboard/metas]', err)
    res.status(500).json({ error: err.message })
  }
}
