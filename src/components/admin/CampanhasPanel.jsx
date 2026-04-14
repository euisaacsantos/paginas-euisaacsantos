import { useCallback, useEffect, useRef, useState } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtBRL  = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
const fmtPct  = (n) => `${(Number(n) || 0).toFixed(1)}%`
const fmtNum  = (n) => (Number(n) || 0).toLocaleString('pt-BR')
const fmtMon  = (n) => `${(Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}`

function pctOf(a, b) { return b > 0 ? (a / b) * 100 : 0 }
function pctColor(p) {
  if (p >= 3)   return '#22c55e'
  if (p >= 1)   return '#eab308'
  return '#ef4444'
}
function rateColor(p) {
  if (p >= 60) return '#22c55e'
  if (p >= 30) return '#eab308'
  return '#ef4444'
}

// Tenta fazer match entre nome da Meta (campaign/adset/ad) e UTM do banco
function findAttrib(attribMap, name) {
  if (!name || !attribMap) return null
  const key = name.toLowerCase().trim()
  if (attribMap[key]) return attribMap[key]
  // partial match: utm contém parte do nome ou nome contém o utm
  for (const [k, v] of Object.entries(attribMap)) {
    if (k && (key.includes(k) || k.includes(key))) return v
  }
  return null
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function Pct({ value, color }) {
  const c = color || pctColor(value)
  return <span style={{ color: c, fontWeight: 700 }}>{fmtPct(value)}</span>
}

// ─── Célula numérica ──────────────────────────────────────────────────────────
const TD = ({ children, right = true, muted = false, style = {} }) => (
  <td style={{
    padding: '10px 12px',
    textAlign: right ? 'right' : 'left',
    fontSize: 12,
    color: muted ? '#52525b' : '#d4d4d8',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </td>
)

const TH = ({ children, right = true }) => (
  <th style={{
    padding: '8px 12px',
    textAlign: right ? 'right' : 'left',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#52525b',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    background: '#0e0e12',
    zIndex: 2,
  }}>
    {children}
  </th>
)

// ─── Linha de métricas ────────────────────────────────────────────────────────
function MetricRow({ row, attrib, level, isExpanded, onToggle, depth = 0, datePreset, token }) {
  const db = attrib || { ingressos: 0, order_bumps: 0, mesa: 0, fat_ingresso: 0, fat_order_bump: 0, fat_mesa: 0 }
  const hasAttrib = db.ingressos > 0 || db.order_bumps > 0 || db.mesa > 0

  const purchaseRate   = pctOf(db.ingressos, row.checkout)          // CK→Compra DB
  const convPage       = pctOf(db.ingressos, row.page_views)        // Conv. Página
  const obConv         = pctOf(db.order_bumps, db.ingressos)        // OB%
  const fatTotal       = db.fat_ingresso + db.fat_order_bump + db.fat_mesa
  const totalVendas    = db.ingressos + db.order_bumps + db.mesa
  const ticketMedio    = totalVendas > 0 ? fatTotal / totalVendas : 0
  const cac            = db.ingressos > 0 ? row.spend / db.ingressos : 0

  const name = row.ad_name || row.adset_name || row.campaign_name || '—'
  const canExpand = level !== 'ad'

  const indentPx = depth * 20

  return (
    <tr
      style={{ cursor: canExpand ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,140,60,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      onClick={() => canExpand && onToggle && onToggle(row)}
    >
      {/* Nome */}
      <td style={{
        padding: '10px 12px',
        paddingLeft: 12 + indentPx,
        fontSize: 12,
        color: '#e4e4e7',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        minWidth: 240,
        maxWidth: 320,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Thumbnail (somente ad level) */}
          {level === 'ad' && row.thumbnail?.thumbnail_url && (
            <img
              src={row.thumbnail.thumbnail_url}
              alt=""
              style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
            />
          )}
          {/* Expand arrow */}
          {canExpand && (
            <span style={{ color: '#52525b', fontSize: 10, flexShrink: 0 }}>
              {isExpanded ? '▾' : '▸'}
            </span>
          )}
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: depth === 0 ? '#ff8c3c' : depth === 1 ? '#e4e4e7' : '#a1a1aa',
            fontWeight: depth === 0 ? 700 : 400,
          }}>
            {name}
          </span>
          {/* Link externo (ad level) */}
          {level === 'ad' && row.ad_manager_url && (
            <a
              href={row.ad_manager_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: '#52525b', fontSize: 10, flexShrink: 0, textDecoration: 'none' }}
              title="Abrir no Ads Manager"
            >
              ↗
            </a>
          )}
        </div>
      </td>

      {/* Investimento */}
      <TD style={{ color: '#ff8c3c', fontWeight: 700 }}>{fmtBRL(row.spend)}</TD>

      {/* CPM */}
      <TD muted>{fmtBRL(row.cpm)}</TD>

      {/* Impressões */}
      <TD muted>{fmtNum(row.impressions)}</TD>

      {/* Cliques no link */}
      <TD>{fmtNum(row.link_clicks)}</TD>

      {/* CTR link */}
      <TD><Pct value={row.link_ctr} color={row.link_ctr >= 1 ? '#22c55e' : row.link_ctr >= 0.5 ? '#eab308' : '#ef4444'} /></TD>

      {/* Connect Rate */}
      <TD>
        {row.link_clicks > 0
          ? <Pct value={row.connect_rate * 100} color={rateColor(row.connect_rate * 100)} />
          : <span style={{ color: '#3f3f46' }}>—</span>}
      </TD>

      {/* PageViews */}
      <TD muted>{row.page_views > 0 ? fmtNum(row.page_views) : <span style={{ color: '#3f3f46' }}>—</span>}</TD>

      {/* PV→CK% */}
      <TD>
        {row.page_views > 0
          ? <Pct value={pctOf(row.checkout, row.page_views)} color={rateColor(pctOf(row.checkout, row.page_views))} />
          : <span style={{ color: '#3f3f46' }}>—</span>}
      </TD>

      {/* CK→Compra DB% */}
      <TD>
        {row.checkout > 0 && hasAttrib
          ? <Pct value={purchaseRate} color={pctColor(purchaseRate)} />
          : <span style={{ color: '#3f3f46' }}>—</span>}
      </TD>

      {/* Conv. Página DB% */}
      <TD>
        {row.page_views > 0 && hasAttrib
          ? <Pct value={convPage} color={pctColor(convPage)} />
          : <span style={{ color: '#3f3f46' }}>—</span>}
      </TD>

      {/* Compras Meta */}
      <TD muted>{row.purchases_meta > 0 ? fmtNum(row.purchases_meta) : <span style={{ color: '#3f3f46' }}>—</span>}</TD>

      {/* Ingresso DB */}
      <TD style={{ color: db.ingressos > 0 ? '#ff8c3c' : '#3f3f46' }}>
        {db.ingressos > 0 ? db.ingressos : '—'}
      </TD>

      {/* OB DB */}
      <TD>{db.order_bumps > 0 ? db.order_bumps : <span style={{ color: '#3f3f46' }}>—</span>}</TD>

      {/* OB% */}
      <TD>
        {db.ingressos > 0
          ? <Pct value={obConv} color={obConv >= 30 ? '#22c55e' : obConv >= 15 ? '#eab308' : '#ef4444'} />
          : <span style={{ color: '#3f3f46' }}>—</span>}
      </TD>

      {/* Mesa DB */}
      <TD style={{ color: db.mesa > 0 ? '#ef4444' : '#3f3f46' }}>
        {db.mesa > 0 ? db.mesa : '—'}
      </TD>

      {/* Faturamento total */}
      <TD style={{ color: fatTotal > 0 ? '#22c55e' : '#3f3f46', fontWeight: fatTotal > 0 ? 700 : 400 }}>
        {fatTotal > 0 ? fmtBRL(fatTotal) : '—'}
      </TD>

      {/* Ticket médio */}
      <TD muted>{ticketMedio > 0 ? fmtMon(ticketMedio) : <span style={{ color: '#3f3f46' }}>—</span>}</TD>

      {/* CAC */}
      <TD style={{ color: cac > 0 ? (cac <= 50 ? '#22c55e' : cac <= 100 ? '#eab308' : '#ef4444') : '#3f3f46' }}>
        {cac > 0 ? fmtMon(cac) : '—'}
      </TD>
    </tr>
  )
}

// ─── Linha "carregando filhos" ─────────────────────────────────────────────────
function LoadingRow({ depth }) {
  return (
    <tr>
      <td colSpan={19} style={{ padding: `8px ${12 + depth * 20}px`, fontSize: 11, color: '#52525b' }}>
        Carregando…
      </td>
    </tr>
  )
}

// ─── Totais ───────────────────────────────────────────────────────────────────
function TotalRow({ rows, attribMap, attribKey }) {
  let spend = 0, impressions = 0, linkClicks = 0, pageViews = 0, checkout = 0, purchMeta = 0
  let ingressos = 0, oBumps = 0, mesa = 0, fatIng = 0, fatOB = 0, fatMesa = 0

  for (const r of rows) {
    spend      += r.spend
    impressions+= r.impressions
    linkClicks += r.link_clicks
    pageViews  += r.page_views
    checkout   += r.checkout
    purchMeta  += r.purchases_meta
    const db = findAttrib(attribMap, r[attribKey])
    if (db) {
      ingressos += db.ingressos; oBumps += db.order_bumps; mesa += db.mesa
      fatIng += db.fat_ingresso; fatOB += db.fat_order_bump; fatMesa += db.fat_mesa
    }
  }

  const cpm      = impressions > 0 ? (spend / impressions) * 1000 : 0
  const ctr      = impressions > 0 ? (linkClicks / impressions) * 100 : 0
  const connect  = linkClicks  > 0 ? pctOf(pageViews, linkClicks) : 0
  const pvCk     = pctOf(checkout, pageViews)
  const ckComp   = pctOf(ingressos, checkout)
  const convPag  = pctOf(ingressos, pageViews)
  const obConv   = pctOf(oBumps, ingressos)
  const fatTotal = fatIng + fatOB + fatMesa
  const totalV   = ingressos + oBumps + mesa
  const ticket   = totalV > 0 ? fatTotal / totalV : 0
  const cac      = ingressos > 0 ? spend / ingressos : 0

  const S = { fontWeight: 700, color: '#e4e4e7', background: '#111116', borderTop: '1px solid rgba(255,140,60,0.2)' }
  const td = (children, extra = {}) => (
    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, borderTop: '1px solid rgba(255,140,60,0.2)', ...S, ...extra }}>
      {children}
    </td>
  )

  return (
    <tr>
      <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#ff8c3c', ...S, textAlign: 'left' }}>TOTAL</td>
      {td(fmtBRL(spend), { color: '#ff8c3c' })}
      {td(fmtBRL(cpm), { color: '#71717a' })}
      {td(fmtNum(impressions), { color: '#71717a' })}
      {td(fmtNum(linkClicks))}
      {td(<Pct value={ctr} color={ctr >= 1 ? '#22c55e' : '#eab308'} />)}
      {td(<Pct value={connect} color={rateColor(connect)} />)}
      {td(fmtNum(pageViews), { color: '#71717a' })}
      {td(<Pct value={pvCk} color={rateColor(pvCk)} />)}
      {td(ckComp > 0 ? <Pct value={ckComp} color={pctColor(ckComp)} /> : '—')}
      {td(convPag > 0 ? <Pct value={convPag} color={pctColor(convPag)} /> : '—')}
      {td(purchMeta > 0 ? fmtNum(purchMeta) : '—', { color: '#71717a' })}
      {td(ingressos > 0 ? ingressos : '—', { color: '#ff8c3c' })}
      {td(oBumps > 0 ? oBumps : '—')}
      {td(obConv > 0 ? <Pct value={obConv} color={obConv >= 30 ? '#22c55e' : '#eab308'} /> : '—')}
      {td(mesa > 0 ? mesa : '—', { color: '#ef4444' })}
      {td(fatTotal > 0 ? fmtBRL(fatTotal) : '—', { color: '#22c55e' })}
      {td(ticket > 0 ? fmtMon(ticket) : '—', { color: '#71717a' })}
      {td(cac > 0 ? fmtMon(cac) : '—', { color: cac > 0 && cac <= 50 ? '#22c55e' : '#ef4444' })}
    </tr>
  )
}

// ─── Painel principal ──────────────────────────────────────────────────────────
export default function CampanhasPanel({ token, onSpendTotal }) {
  const [campaigns, setCampaigns]     = useState([])
  const [atrib, setAtrib]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [err, setErr]                 = useState(null)
  const [datePreset, setDatePreset]   = useState('lifetime')
  const [expanded, setExpanded]       = useState({})   // campaign_id → adset rows | true=loading
  const [adExpanded, setAdExpanded]   = useState({})   // adset_id → ad rows | true=loading

  const load = useCallback(async () => {
    setLoading(true); setErr(null); setExpanded({}); setAdExpanded({})
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/dashboard/meta-ads?token=${encodeURIComponent(token)}&level=campaign&date_preset=${datePreset}`),
        fetch(`/api/dashboard/atribuicao?token=${encodeURIComponent(token)}`),
      ])
      const [j1, j2] = await Promise.all([r1.json(), r2.json()])
      if (!r1.ok) throw new Error(j1.error || `Meta Ads ${r1.status}`)
      if (!r2.ok) throw new Error(j2.error || `Atribuição ${r2.status}`)
      setCampaigns(j1.rows || [])
      setAtrib(j2)
      // Informa spend total ao pai
      if (onSpendTotal) {
        const total = (j1.rows || []).reduce((s, r) => s + r.spend, 0)
        onSpendTotal(total)
      }
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }, [token, datePreset, onSpendTotal])

  useEffect(() => { load() }, [load])

  // ── Toggle campanha → carrega adsets ──────────────────────────────────────
  async function toggleCampaign(row) {
    const cid = row.campaign_id
    if (expanded[cid]) {
      setExpanded((e) => { const n = { ...e }; delete n[cid]; return n })
      return
    }
    setExpanded((e) => ({ ...e, [cid]: 'loading' }))
    try {
      const r = await fetch(`/api/dashboard/meta-ads?token=${encodeURIComponent(token)}&level=adset&campaign_id=${cid}&date_preset=${datePreset}`)
      const j = await r.json()
      setExpanded((e) => ({ ...e, [cid]: j.rows || [] }))
    } catch {
      setExpanded((e) => ({ ...e, [cid]: [] }))
    }
  }

  // ── Toggle adset → carrega anúncios ───────────────────────────────────────
  async function toggleAdset(row, campaignId) {
    const aid = row.adset_id
    if (adExpanded[aid]) {
      setAdExpanded((e) => { const n = { ...e }; delete n[aid]; return n })
      return
    }
    setAdExpanded((e) => ({ ...e, [aid]: 'loading' }))
    try {
      const r = await fetch(`/api/dashboard/meta-ads?token=${encodeURIComponent(token)}&level=ad&adset_id=${aid}&campaign_id=${campaignId}&date_preset=${datePreset}`)
      const j = await r.json()
      setAdExpanded((e) => ({ ...e, [aid]: j.rows || [] }))
    } catch {
      setAdExpanded((e) => ({ ...e, [aid]: [] }))
    }
  }

  const por_campaign = atrib?.por_campaign || {}
  const por_content  = atrib?.por_content  || {}
  const por_term     = atrib?.por_term     || {}

  const headers = [
    ['Campanha / Conjunto / Anúncio', false],
    ['Invest.', true], ['CPM', true], ['Impressões', true],
    ['Cliques', true], ['CTR Link', true], ['Connect', true],
    ['PV', true], ['PV→CK', true], ['CK→Compra', true], ['Conv. Pág', true],
    ['Compras Meta', true],
    ['Ingresso', true], ['OB', true], ['OB%', true], ['Mesa', true],
    ['Faturamento', true], ['T. Médio', true], ['CAC', true],
  ]

  return (
    <div style={{ background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: '0 24px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', textTransform: 'uppercase' }}>
          Campanhas · [VENDAS][IMERSAO]
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {['lifetime', 'this_month', 'last_30d', 'this_week'].map((dp) => (
            <button key={dp} onClick={() => setDatePreset(dp)} style={{
              background: datePreset === dp ? 'rgba(255,140,60,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${datePreset === dp ? 'rgba(255,140,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6, color: datePreset === dp ? '#ff8c3c' : '#71717a',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              padding: '5px 10px', cursor: 'pointer',
            }}>
              {dp === 'lifetime' ? 'Total' : dp === 'this_month' ? 'Este mês' : dp === 'last_30d' ? 'Últimos 30d' : 'Esta semana'}
            </button>
          ))}
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}>
            ↻
          </button>
        </div>
      </div>

      {err && (
        <div style={{ margin: '0 24px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 12 }}>
          {err.includes('(#200)') || err.includes('permission')
            ? 'Permissão negada — o token precisa do escopo ads_read na Meta.'
            : `Erro: ${err}`}
        </div>
      )}

      {loading && (
        <div style={{ padding: '24px', color: '#52525b', fontSize: 12 }}>Carregando campanhas…</div>
      )}

      {!loading && !err && campaigns.length === 0 && (
        <div style={{ padding: '24px', color: '#52525b', fontSize: 12 }}>
          Nenhuma campanha com prefixo [VENDAS][IMERSAO] encontrada.
        </div>
      )}

      {campaigns.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", minWidth: 1100 }}>
            <thead>
              <tr>
                {headers.map(([label, right]) => <TH key={label} right={right}>{label}</TH>)}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => {
                const campAttrib = findAttrib(por_campaign, camp.campaign_name)
                const campExpanded = expanded[camp.campaign_id]
                const adsets = Array.isArray(campExpanded) ? campExpanded : []

                return [
                  // Linha de campanha
                  <MetricRow
                    key={camp.id}
                    row={camp}
                    attrib={campAttrib}
                    level="campaign"
                    isExpanded={!!campExpanded}
                    onToggle={toggleCampaign}
                    depth={0}
                    token={token}
                    datePreset={datePreset}
                  />,

                  // Loading adsets
                  campExpanded === 'loading' && <LoadingRow key={`${camp.id}-loading`} depth={1} />,

                  // Adsets
                  ...adsets.map((adset) => {
                    const adsetAttrib  = findAttrib(por_content, adset.adset_name) || findAttrib(por_campaign, camp.campaign_name)
                    const adsetExpanded = adExpanded[adset.adset_id]
                    const ads = Array.isArray(adsetExpanded) ? adsetExpanded : []

                    return [
                      <MetricRow
                        key={adset.id}
                        row={adset}
                        attrib={adsetAttrib}
                        level="adset"
                        isExpanded={!!adsetExpanded}
                        onToggle={(r) => toggleAdset(r, camp.campaign_id)}
                        depth={1}
                        token={token}
                        datePreset={datePreset}
                      />,

                      adsetExpanded === 'loading' && <LoadingRow key={`${adset.id}-loading`} depth={2} />,

                      ...ads.map((ad) => {
                        const adAttrib = findAttrib(por_term, ad.ad_name) || adsetAttrib
                        return (
                          <MetricRow
                            key={ad.id}
                            row={ad}
                            attrib={adAttrib}
                            level="ad"
                            depth={2}
                            token={token}
                            datePreset={datePreset}
                          />
                        )
                      }),
                    ]
                  }),
                ]
              })}

              {/* Linha de totais */}
              <TotalRow rows={campaigns} attribMap={por_campaign} attribKey="campaign_name" />
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda colunas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', padding: '16px 24px 0', fontSize: 10, color: '#3f3f46' }}>
        <span>PV = Page Views</span>
        <span>CK = Checkout (InitiateCheckout)</span>
        <span>Connect = PV/Cliques</span>
        <span>Conv. Pág = Ingressos DB / PV</span>
        <span>CAC = Invest./Ingressos DB</span>
        <span>▸ clique para expandir</span>
      </div>
    </div>
  )
}
