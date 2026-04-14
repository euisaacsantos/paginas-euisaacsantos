import { requireAdmin } from './_auth.js'

const GRAPH = 'https://graph.facebook.com/v21.0'
const CAMP_PREFIX = '[VENDAS][IMERSAO]'

function act(id) { return `act_${id}` }

function getAction(actions, ...types) {
  if (!Array.isArray(actions)) return 0
  let total = 0
  for (const type of types) {
    const found = actions.find((a) => a.action_type === type)
    if (found) total += Number(found.value) || 0
  }
  return total
}

function buildInsightFields(level) {
  const base = 'spend,impressions,cpm,inline_link_clicks,inline_link_click_ctr,actions'
  if (level === 'campaign') return `campaign_id,campaign_name,${base}`
  if (level === 'adset')    return `adset_id,adset_name,campaign_id,campaign_name,${base}`
  return `ad_id,ad_name,adset_id,adset_name,campaign_id,${base}`
}

async function fetchAll(url) {
  const rows = []
  let next = url
  let page = 0
  while (next) {
    const res = await fetch(next)
    const json = await res.json()
    if (!res.ok) throw Object.assign(new Error('Meta API error'), { meta: json })
    const chunk = json.data || []
    rows.push(...chunk)
    page++
    // Insights usa paging.next (URL completa com cursor after=)
    // Se não vier next, tenta construir com cursor
    const nextUrl = json.paging?.next || null
    const afterCursor = json.paging?.cursors?.after || null
    if (nextUrl) {
      next = nextUrl
    } else if (afterCursor && chunk.length > 0) {
      // Monta próxima página com cursor
      const u = new URL(next)
      u.searchParams.set('after', afterCursor)
      next = u.toString()
    } else {
      next = null
    }
    // Segurança: max 20 páginas (~10k registros)
    if (page >= 20) break
  }
  console.log(`[meta-ads] fetchAll: ${rows.length} rows em ${page} páginas`)
  return rows
}

// GET /api/dashboard/meta-ads?token=X
//   &level=campaign|adset|ad
//   &campaign_id=   (obrigatório para adset/ad)
//   &adset_id=      (obrigatório para ad)
//   &date_preset=lifetime|this_month|last_30d
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  const token   = process.env.META_ADS_ACCESS_TOKEN
  const acctId  = process.env.META_ADS_ACCOUNT_ID
  if (!token || !acctId) {
    return res.status(500).json({ error: 'META_ADS_ACCESS_TOKEN ou META_ADS_ACCOUNT_ID ausentes' })
  }

  try {
    const level       = req.query.level || 'campaign'
    const campaignId  = req.query.campaign_id || null
    const adsetId     = req.query.adset_id || null
    const datePreset  = req.query.date_preset || 'maximum'
    const since       = req.query.since || null   // YYYY-MM-DD (range customizado)
    const until       = req.query.until || null

    // ── Insights ──────────────────────────────────────────────────────────────
    // Filtro de nome de campanha é feito CLIENT-SIDE após receber os dados —
    // os colchetes em [VENDAS][IMERSAO] causam problemas no filtro server-side da Meta.
    const filters = []
    if (campaignId) filters.push({ field: 'campaign.id', operator: 'EQUAL', value: campaignId })
    if (adsetId)    filters.push({ field: 'adset.id',    operator: 'EQUAL', value: adsetId })

    const p = new URLSearchParams({
      level,
      fields: buildInsightFields(level),
      limit: '500',
      access_token: token,
      ...(since && until
        ? { time_range: JSON.stringify({ since, until }) }
        : { date_preset: datePreset }),
      ...(filters.length && { filtering: JSON.stringify(filters) }),
    })

    const insightsUrl = `${GRAPH}/${act(acctId)}/insights?${p}`
    console.log('[meta-ads] url:', insightsUrl.replace(token, 'TOKEN'))

    let insightsRows = await fetchAll(insightsUrl)
    console.log(`[meta-ads] total antes do filtro: ${insightsRows.length}`)
    console.log('[meta-ads] nomes:', insightsRows.map(r => r.campaign_name).slice(0, 5))

    // Filtra pelo prefixo client-side (evita problema com [] no filtro da API)
    if (level === 'campaign') {
      const prefix = CAMP_PREFIX.toLowerCase()
      insightsRows = insightsRows.filter(
        (r) => r.campaign_name && r.campaign_name.toLowerCase().includes(prefix)
      )
      console.log(`[meta-ads] total após filtro prefixo: ${insightsRows.length}`)
    }

    // ── Thumbnails (só no nível de anúncio) ────────────────────────────────
    let thumbMap = {}
    if (level === 'ad' && insightsRows.length > 0) {
      const adIds = [...new Set(insightsRows.map((r) => r.ad_id).filter(Boolean))]
      for (let i = 0; i < adIds.length; i += 50) {
        const batch = adIds.slice(i, i + 50)
        const tp = new URLSearchParams({
          ids: batch.join(','),
          fields: 'id,creative{thumbnail_url,object_url,effective_object_url}',
          access_token: token,
        })
        const tr = await fetch(`${GRAPH}/?${tp}`)
        if (tr.ok) {
          const tj = await tr.json()
          for (const [id, ad] of Object.entries(tj || {})) {
            thumbMap[id] = {
              thumbnail_url: ad.creative?.thumbnail_url || null,
              ad_url: ad.creative?.effective_object_url || ad.creative?.object_url || null,
            }
          }
        }
      }
    }

    // ── Normaliza ──────────────────────────────────────────────────────────
    const rows = insightsRows.map((r) => {
      const actions    = r.actions || []
      const spend      = Number(r.spend)               || 0
      const impressions= Number(r.impressions)          || 0
      const cpm        = Number(r.cpm)                  || 0
      const linkClicks = Number(r.inline_link_clicks)   || 0
      const linkCtr    = Number(r.inline_link_click_ctr)|| 0
      const pageViews  = getAction(actions, 'landing_page_view')
      const checkout   = getAction(actions, 'initiate_checkout')
      const purchMeta  = getAction(actions, 'purchase', 'offsite_conversion.fb_pixel_purchase')
      const adId       = r.ad_id || null

      return {
        id:            adId || r.adset_id || r.campaign_id,
        campaign_id:   r.campaign_id   || null,
        campaign_name: r.campaign_name || null,
        adset_id:      r.adset_id      || null,
        adset_name:    r.adset_name    || null,
        ad_id:         adId,
        ad_name:       r.ad_name       || null,
        spend,
        impressions,
        cpm,
        link_clicks:   linkClicks,
        link_ctr:      linkCtr,
        page_views:    pageViews,
        checkout,
        purchases_meta: purchMeta,
        connect_rate:  linkClicks > 0 ? pageViews / linkClicks : 0,
        checkout_rate: pageViews  > 0 ? checkout  / pageViews  : 0,
        // purchase rates calculadas no frontend após join com DB
        thumbnail:     adId ? (thumbMap[adId] || null) : null,
        ad_manager_url: adId
          ? `https://www.facebook.com/adsmanager/manage/ads?act=${acctId}&selected_ad_ids=${adId}`
          : null,
      }
    })

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ rows, level })
  } catch (err) {
    console.error('[api/dashboard/meta-ads]', err)
    const meta = err.meta || null
    res.status(502).json({ error: err.message, meta })
  }
}
