import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/leads-pendentes?token=X&status=&produto_tipo=&limit=50&offset=0
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase    = getSupabase()
    const limit       = Math.min(200, parseInt(req.query.limit  || '50', 10))
    const offset      = Math.max(0,   parseInt(req.query.offset || '0',  10))
    const statusFilter = req.query.status        || null // abandoned_cart | pix_generated | purchased
    const produtoTipo  = req.query.produto_tipo  || null

    // KPIs: todos os registros exceto purchased (que já converteram)
    const { data: all, error: allErr } = await supabase
      .from('cct_leads')
      .select('status, produto_tipo, valor')

    if (allErr) throw allErr

    const kpis = {
      pix_pendente:     0,
      abandon_pendente: 0,
      total_pendente:   0,
      purchased:        0,
      valor_potencial:  0,
    }

    for (const r of all || []) {
      const valor = Number(r.valor) || 0
      if (r.status === 'pix_generated')  { kpis.pix_pendente++;     kpis.total_pendente++; kpis.valor_potencial += valor }
      if (r.status === 'abandoned_cart') { kpis.abandon_pendente++;  kpis.total_pendente++; kpis.valor_potencial += valor }
      if (r.status === 'purchased')        kpis.purchased++
    }

    // Tabela paginada: por padrão só mostra pendentes (abandoned_cart e pix_generated)
    let query = supabase
      .from('cct_leads')
      .select(
        'id, created_at, updated_at, status, ticto_transaction_id, produto_tipo, lote_id, offer_code, ' +
        'email, nome, telefone, valor, utm_source, utm_campaign, ' +
        'abandoned_at, pix_generated_at, purchased_at, session_id',
        { count: 'exact' }
      )
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    } else {
      query = query.in('status', ['abandoned_cart', 'pix_generated'])
    }
    if (produtoTipo) query = query.eq('produto_tipo', produtoTipo)

    const { data, error, count } = await query
    if (error) throw error

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ kpis, leads: data || [], total: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[api/dashboard/leads-pendentes]', err)
    res.status(500).json({ error: err.message })
  }
}
