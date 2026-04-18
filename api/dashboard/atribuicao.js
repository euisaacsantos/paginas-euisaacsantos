import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/atribuicao?token=X
// Retorna vendas do DB agrupadas por utm_campaign / utm_content / utm_term
// para cruzar com dados da Meta Ads API por UTM.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('cct_vendas')
      .select('utm_campaign, utm_medium, utm_content, utm_term, produto_tipo, valor')

    if (error) throw error

    function emptyBucket() {
      return { ingressos: 0, order_bumps: 0, mesa: 0, fat_ingresso: 0, fat_order_bump: 0, fat_mesa: 0 }
    }
    function add(bucket, row) {
      const v = Number(row.valor) || 0
      if (row.produto_tipo === 'imersao')    { bucket.ingressos   += 1; bucket.fat_ingresso   += v }
      else if (row.produto_tipo === 'mesa')  { bucket.mesa        += 1; bucket.fat_mesa        += v }
      else                                   { bucket.order_bumps += 1; bucket.fat_order_bump  += v }
    }

    // utm_medium = nome do conjunto (adset)
    // utm_content = nome do anúncio (ad)
    const byCampaign = {}
    const byMedium   = {}  // adset → utm_medium
    const byContent  = {}  // ad    → utm_content

    for (const row of data || []) {
      const camp    = (row.utm_campaign || '').toLowerCase().trim() || '(sem utm)'
      const medium  = (row.utm_medium   || '').toLowerCase().trim()
      const content = (row.utm_content  || '').toLowerCase().trim()

      if (!byCampaign[camp]) byCampaign[camp] = { utm_campaign: row.utm_campaign, ...emptyBucket() }
      add(byCampaign[camp], row)

      if (medium) {
        if (!byMedium[medium]) byMedium[medium] = { utm_medium: row.utm_medium, ...emptyBucket() }
        add(byMedium[medium], row)
      }

      if (content) {
        if (!byContent[content]) byContent[content] = { utm_content: row.utm_content, ...emptyBucket() }
        add(byContent[content], row)
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ por_campaign: byCampaign, por_adset: byMedium, por_ad: byContent })
  } catch (err) {
    console.error('[api/dashboard/atribuicao]', err)
    res.status(500).json({ error: err.message })
  }
}
