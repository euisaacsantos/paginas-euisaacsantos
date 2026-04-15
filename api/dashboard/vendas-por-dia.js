import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// BRT = UTC-3 (Brasil não tem horário de verão desde 2019)
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000
function utcToBRTDate(isoStr) {
  return new Date(new Date(isoStr).getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10)
}

// GET /api/dashboard/vendas-por-dia?token=X&days=14
// Retorna vendas agrupadas por dia (em BRT) e produto_tipo.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabase()
    const days = Math.min(60, Math.max(1, parseInt(req.query.days || '14', 10)))

    // "Hoje" em BRT: subtrai o offset do UTC now
    const nowBRT = new Date(Date.now() - BRT_OFFSET_MS)

    // Primeiro dia do range (meia-noite BRT → converte para UTC pro filtro Supabase)
    const sinceBRT = new Date(nowBRT)
    sinceBRT.setDate(sinceBRT.getDate() - days + 1)
    sinceBRT.setHours(0, 0, 0, 0)
    const sinceUTC = new Date(sinceBRT.getTime() + BRT_OFFSET_MS)

    const { data, error } = await supabase
      .from('cct_vendas')
      .select('created_at, produto_tipo, valor')
      .gte('created_at', sinceUTC.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // Agrupa por data BRT (YYYY-MM-DD)
    const byDay = {}
    for (const row of data || []) {
      const day = utcToBRTDate(row.created_at)
      if (!byDay[day]) byDay[day] = { imersao: 0, order_bump: 0, mesa: 0, total: 0, faturamento: 0 }
      const tipo = row.produto_tipo || 'order_bump'
      if (byDay[day][tipo] !== undefined) byDay[day][tipo] += 1
      byDay[day].total += 1
      byDay[day].faturamento += Number(row.valor) || 0
    }

    // Gera array com todos os dias do intervalo em BRT (preenche zeros)
    const result = []
    for (let i = 0; i < days; i++) {
      const d = new Date(sinceBRT)
      d.setDate(sinceBRT.getDate() + i)
      const key = d.toISOString().slice(0, 10)  // já está em BRT
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
