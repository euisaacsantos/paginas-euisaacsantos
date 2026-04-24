import { requireAdmin } from './_auth.js'

const GRAPH = 'https://graph.facebook.com/v21.0'
const CAMP_PREFIX = '[VENDAS][IMERSAO]'

function act(id) { return `act_${id}` }

function getAction(actions, ...types) {
  if (!Array.isArray(actions)) return 0
  // Usa o primeiro tipo que tiver valor — não soma (evita dupla contagem de aliases)
  for (const type of types) {
    const found = actions.find((a) => a.action_type === type)
    if (found) return Number(found.value) || 0
  }
  return 0
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
    const nextUrl = json.paging?.next || null
    const afterCursor = json.paging?.cursors?.after || null
    if (nextUrl) {
      next = nextUrl
    } else if (afterCursor && chunk.length > 0) {
      const u = new URL(next)
      u.searchParams.set('after', afterCursor)
      next = u.toString()
    } else {
      next = null
    }
    if (page >= 20) break
  }
  return rows
}

function normalizeRow(r, thumbMap, acctId) {
  const actions    = r.actions || []
  const spend      = Number(r.spend)                || 0
  const impressions= Number(r.impressions)           || 0
  const cpm        = Number(r.cpm)                   || 0
  const linkClicks = Number(r.inline_link_clicks)    || 0
  const linkCtr    = Number(r.inline_link_click_ctr) || 0
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
    status:        r.status        || null,
    effective_status: r.effective_status || null,
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
    daily_budget:    r.daily_budget    ? Number(r.daily_budget)    / 100 : null,
    lifetime_budget: r.lifetime_budget ? Number(r.lifetime_budget) / 100 : null,
    thumbnail:     adId ? (thumbMap[adId] || null) : null,
    ad_manager_url: adId
      ? `https://www.facebook.com/adsmanager/manage/ads?act=${acctId}&selected_ad_ids=${adId}`
      : null,
  }
}

// GET /api/dashboard/meta-ads?token=X
//   &level=campaign|adset|ad
//   &campaign_id=   (obrigatório para adset/ad)
//   &adset_id=      (obrigatório para ad)
//   &date_preset=this_month|last_30d|last_90d
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
    const datePreset  = req.query.date_preset || null
    const since       = req.query.since || null
    const until       = req.query.until || null

    // Default: 36 meses atrás até hoje (Meta permite até 37 meses)
    const todayISO  = new Date().toISOString().slice(0, 10)
    const sinceDate = new Date()
    sinceDate.setMonth(sinceDate.getMonth() - 36)
    const sinceISO  = sinceDate.toISOString().slice(0, 10)
    const defaultRange = { since: sinceISO, until: todayISO }

    const timeParams = since && until
      ? { time_range: JSON.stringify({ since, until }) }
      : datePreset
      ? { date_preset: datePreset }
      : { time_range: JSON.stringify(defaultRange) }

    // ── Nível campanha: busca /campaigns primeiro (inclui pausadas), depois merge insights ──
    if (level === 'campaign') {
      // 1. Busca todas as campanhas da conta (inclui pausadas)
      const cp = new URLSearchParams({
        fields: 'id,name,status,effective_status,daily_budget,lifetime_budget',
        limit: '500',
        access_token: token,
      })
      const allCampaigns = await fetchAll(`${GRAPH}/${act(acctId)}/campaigns?${cp}`)
      const prefix = CAMP_PREFIX.toLowerCase()
      const filtered = allCampaigns.filter(
        (c) => c.name && c.name.toLowerCase().includes(prefix)
      )

      let rows = []

      if (filtered.length > 0) {
        // 2. Busca insights apenas para essas campanhas (filtra por campaign.id IN [...])
        const campaignIds = filtered.map((c) => c.id)
        const ip = new URLSearchParams({
          level: 'campaign',
          fields: buildInsightFields('campaign'),
          limit: '500',
          access_token: token,
          filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: campaignIds }]),
          ...timeParams,
        })
        const insightsRows = await fetchAll(`${GRAPH}/${act(acctId)}/insights?${ip}`)
        const insightsMap = {}
        for (const r of insightsRows) {
          insightsMap[r.campaign_id] = r
        }

        // 3. Left-join: todas as campanhas filtradas + métricas (zeros se sem spend)
        rows = filtered.map((c) => {
          const insight = insightsMap[c.id] || {}
          return normalizeRow({
            campaign_id:     c.id,
            campaign_name:   c.name,
            status:          c.status,
            effective_status: c.effective_status,
            daily_budget:    c.daily_budget,
            lifetime_budget: c.lifetime_budget,
            ...insight,
          }, {}, acctId)
        })
      }

      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ rows, level })
    }

    // ── Níveis adset/ad: usa Insights diretamente (filtra por campaign_id/adset_id) ──
    const filters = []
    if (campaignId) filters.push({ field: 'campaign.id', operator: 'EQUAL', value: campaignId })
    if (adsetId)    filters.push({ field: 'adset.id',    operator: 'EQUAL', value: adsetId })

    const p = new URLSearchParams({
      level,
      fields: buildInsightFields(level),
      limit: '500',
      access_token: token,
      ...timeParams,
      ...(filters.length && { filtering: JSON.stringify(filters) }),
    })

    const insightsRows = await fetchAll(`${GRAPH}/${act(acctId)}/insights?${p}`)

    // Thumbnails (só no nível de anúncio)
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

    // Adset/ad level: fetch budgets + status (não disponíveis na Insights API)
    let budgetMap = {}
    let statusMap = {}
    if (level === 'adset') {
      const adsetIds = [...new Set(insightsRows.map((r) => r.adset_id).filter(Boolean))]
      if (adsetIds.length > 0) {
        try {
          const bp = new URLSearchParams({ ids: adsetIds.join(','), fields: 'id,daily_budget,lifetime_budget,status,effective_status', access_token: token })
          const br = await fetch(`${GRAPH}/?${bp}`)
          if (br.ok) {
            const bj = await br.json()
            budgetMap = bj
            statusMap = bj
          }
        } catch {}
      }
    }
    if (level === 'ad') {
      const adIds = [...new Set(insightsRows.map((r) => r.ad_id).filter(Boolean))]
      if (adIds.length > 0) {
        try {
          const sp = new URLSearchParams({ ids: adIds.join(','), fields: 'id,status,effective_status', access_token: token })
          const sr = await fetch(`${GRAPH}/?${sp}`)
          if (sr.ok) statusMap = await sr.json()
        } catch {}
      }
    }

    const rows = insightsRows.map((r) => {
      const b = budgetMap[r.adset_id] || {}
      const s = statusMap[r.adset_id || r.ad_id] || {}
      return normalizeRow({
        ...r,
        daily_budget: b.daily_budget, lifetime_budget: b.lifetime_budget,
        status: s.status || r.status,
        effective_status: s.effective_status || r.effective_status,
      }, thumbMap, acctId)
    })

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ rows, level })
  } catch (err) {
    console.error('[api/dashboard/meta-ads]', err)
    const meta = err.meta || null
    res.status(502).json({ error: err.message, meta })
  }
}
