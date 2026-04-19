import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// BRT = UTC-3 (Brasil não tem horário de verão desde 2019)
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000
function utcToBRTDate(isoStr) {
  return new Date(new Date(isoStr).getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10)
}
function brtDateToUtcIso(dateStr, endOfDay = false) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + (endOfDay ? 1 : 0), 3, 0, 0, 0)).toISOString()
}

// GET /api/dashboard/vendas-por-dia?token=X&days=14
// GET /api/dashboard/vendas-por-dia?token=X&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
// Retorna vendas agrupadas por dia (em BRT) e produto_tipo.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabase()
    const dateFrom = req.query.date_from || null
    const dateTo   = req.query.date_to   || null

    let sinceUTC, sinceBRT, days

    if (dateFrom && dateTo) {
      // Range explícito: usa date_from/date_to
      sinceUTC = brtDateToUtcIso(dateFrom, false)
      // sinceBRT: meia-noite BRT do dateFrom, para gerar o array de dias
      const [fy, fm, fd] = dateFrom.split('-').map(Number)
      sinceBRT = new Date(Date.UTC(fy, fm - 1, fd, 3, 0, 0, 0) - BRT_OFFSET_MS)
      // Calcula número de dias entre dateFrom e dateTo (inclusivo)
      const [ty, tm, td] = dateTo.split('-').map(Number)
      const fromMs = Date.UTC(fy, fm - 1, fd)
      const toMs   = Date.UTC(ty, tm - 1, td)
      days = Math.round((toMs - fromMs) / 86400000) + 1
    } else {
      // Fallback: lógica original com `days`
      days = Math.min(60, Math.max(1, parseInt(req.query.days || '14', 10)))

      // "Hoje" em BRT: subtrai o offset do UTC now
      const nowBRT = new Date(Date.now() - BRT_OFFSET_MS)

      // Primeiro dia do range (meia-noite BRT → converte para UTC pro filtro Supabase)
      sinceBRT = new Date(nowBRT)
      sinceBRT.setDate(sinceBRT.getDate() - days + 1)
      sinceBRT.setHours(0, 0, 0, 0)
      sinceUTC = new Date(sinceBRT.getTime() + BRT_OFFSET_MS).toISOString()
    }

    let dbQuery = supabase
      .from('cct_vendas')
      .select('created_at, produto_tipo, valor')
      .gte('created_at', sinceUTC)
      .order('created_at', { ascending: true })
    if (dateFrom && dateTo) dbQuery = dbQuery.lt('created_at', brtDateToUtcIso(dateTo, true))

    const { data, error } = await dbQuery

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
