import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/leads-pendentes?token=X&kind=&produto_tipo=&limit=50&offset=0
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase    = getSupabase()
    const limit       = Math.min(200, parseInt(req.query.limit  || '50', 10))
    const offset      = Math.max(0,   parseInt(req.query.offset || '0',  10))
    const kind        = req.query.kind        || null // pix_generated | abandoned_cart
    const produtoTipo = req.query.produto_tipo || null

    // KPIs: todos os registros (sem paginação)
    const { data: all, error: allErr } = await supabase
      .from('cct_leads_pendentes')
      .select('kind, produto_tipo, valor, converted_at, expires_at, created_at')

    if (allErr) throw allErr

    const now = Date.now()
    const kpis = {
      pix_pendente:       0, pix_convertido:       0, pix_expirado:       0,
      abandon_pendente:   0, abandon_convertido:   0, abandon_expirado:   0,
      valor_potencial:    0, valor_recuperado:     0,
    }

    for (const r of all || []) {
      const convertido = !!r.converted_at
      const expirado   = !convertido && r.expires_at && new Date(r.expires_at).getTime() < now
      const pendente   = !convertido && !expirado
      const valor      = Number(r.valor) || 0

      if (r.kind === 'pix_generated') {
        if (convertido)    kpis.pix_convertido   += 1
        else if (expirado) kpis.pix_expirado     += 1
        else               kpis.pix_pendente     += 1
      } else {
        if (convertido)    kpis.abandon_convertido += 1
        else if (expirado) kpis.abandon_expirado   += 1
        else               kpis.abandon_pendente   += 1
      }

      if (pendente)   kpis.valor_potencial += valor
      if (convertido) kpis.valor_recuperado += valor
    }

    // Tabela paginada com filtros
    let query = supabase
      .from('cct_leads_pendentes')
      .select(
        'id, created_at, kind, ticto_transaction_id, produto_tipo, lote_id, offer_code, ' +
        'email, nome, telefone, valor, utm_source, utm_campaign, ' +
        'expires_at, converted_at, session_id',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (kind)        query = query.eq('kind', kind)
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
