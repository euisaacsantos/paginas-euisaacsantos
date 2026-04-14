import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/vendas?token=X&limit=50&offset=0&produto_tipo=&status=
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabase()
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10))
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10))
    const produtoTipo = req.query.produto_tipo || null
    const status = req.query.status || null

    let query = supabase
      .from('cct_vendas')
      .select(
        `id, created_at, ticto_transaction_id, status, offer_code, produto_tipo,
         lote_id, valor, email, telefone, nome,
         utm_source, utm_medium, utm_campaign, utm_content, fbclid,
         meta_capi_sent, meta_capi_fbtrace_id, meta_capi_error,
         session_id, external_id`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (produtoTipo) query = query.eq('produto_tipo', produtoTipo)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      vendas: data || [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/dashboard/vendas]', err)
    res.status(500).json({ error: err.message })
  }
}
