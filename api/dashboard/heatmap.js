import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

const BRT_OFFSET = 3 * 60 * 60 * 1000

// GET /api/dashboard/heatmap?token=X
// Retorna matriz dia_semana (0=Dom…6=Sáb) × hora (0-23) com contagem de vendas imersão
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('cct_vendas')
      .select('created_at')
      .eq('produto_tipo', 'imersao')

    if (error) return res.status(500).json({ error: error.message })

    // Agrupa por dia_semana × hora em BRT
    const matrix = {}
    for (const row of data || []) {
      const brt = new Date(new Date(row.created_at).getTime() - BRT_OFFSET)
      const dow  = brt.getDay()   // 0=Dom … 6=Sáb
      const hour = brt.getHours() // 0-23
      const key  = `${dow}_${hour}`
      matrix[key] = (matrix[key] || 0) + 1
    }

    return res.status(200).json({ matrix, total: data?.length || 0 })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
