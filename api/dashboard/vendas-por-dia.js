import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/vendas-por-dia?token=X&days=14
// Retorna vendas agrupadas por dia (created_at DATE) e produto_tipo.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabase()
    const days = Math.min(60, Math.max(1, parseInt(req.query.days || '14', 10)))

    const since = new Date()
    since.setDate(since.getDate() - days + 1)
    since.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('cct_vendas')
      .select('created_at, produto_tipo, valor')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // Agrupa por data (YYYY-MM-DD) e produto_tipo
    const byDay = {}
    for (const row of data || []) {
      const day = row.created_at.slice(0, 10)
      if (!byDay[day]) byDay[day] = { imersao: 0, order_bump: 0, mesa: 0, total: 0, faturamento: 0 }
      const tipo = row.produto_tipo || 'order_bump'
      if (byDay[day][tipo] !== undefined) byDay[day][tipo] += 1
      byDay[day].total += 1
      byDay[day].faturamento += Number(row.valor) || 0
    }

    // Gera array com todos os dias do intervalo (preenche zeros)
    const result = []
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      result.push({
        date: key,
        ...(byDay[key] || { imersao: 0, order_bump: 0, mesa: 0, total: 0, faturamento: 0 }),
      })
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ dias: result })
  } catch (err) {
    console.error('[api/dashboard/vendas-por-dia]', err)
    res.status(500).json({ error: err.message })
  }
}
