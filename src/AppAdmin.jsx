import { useCallback, useEffect, useRef, useState } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'cct_admin_token'
const EVENT_DATE = new Date('2026-04-25T09:00:00-03:00')

function getTokenFromUrl() {
  try { return new URLSearchParams(window.location.search).get('token') } catch { return null }
}
function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}
function fmtBRLDec(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}
function fmtHora(iso) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDia(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function daysUntilEvent() {
  const now = new Date()
  const diff = EVENT_DATE - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// Cor baseada em % atingido (0–1)
function pctColor(ratio) {
  if (ratio >= 0.9) return '#22c55e'
  if (ratio >= 0.6) return '#eab308'
  return '#ef4444'
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onSubmit }) {
  const [val, setVal] = useState('')
  return (
    <div style={{
      minHeight: '100vh', background: '#070709', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        background: '#0e0e12', border: '1px solid rgba(255,140,60,0.3)', borderRadius: 16,
        padding: '40px 48px', width: '100%', maxWidth: 440,
      }}>
        <div style={{ color: '#ff8c3c', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 8 }}>
          ACESSO RESTRITO
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>
          Dashboard Admin
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()) }}>
          <input
            type="password"
            placeholder="Cole o ADMIN_SECRET aqui"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            style={{
              width: '100%', background: '#18181b', border: '1px solid rgba(255,140,60,0.25)',
              borderRadius: 8, color: '#fff', fontFamily: 'inherit', fontSize: 14,
              padding: '12px 14px', outline: 'none', boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          <button type="submit" style={{
            width: '100%', background: 'linear-gradient(135deg,#ff8c3c,#e05a00)',
            border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700, padding: '12px', cursor: 'pointer',
          }}>
            Entrar →
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Barra de progresso ────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, height = 8, showLabel = false }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const c = color || pctColor(pct / 100)
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height, background: 'rgba(255,255,255,0.07)', borderRadius: height,
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: c,
          borderRadius: height, transition: 'width 0.5s ease',
          boxShadow: `0 0 8px ${c}66`,
        }} />
      </div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: c, fontSize: 11, fontWeight: 700 }}>{Math.round(pct)}%</span>
          <span style={{ color: '#52525b', fontSize: 11 }}>{value}/{max}</span>
        </div>
      )}
    </div>
  )
}

// ─── KPI Card principal ────────────────────────────────────────────────────────
function HeroCard({ label, value, sub, color, progress, children, accent }) {
  return (
    <div style={{
      background: '#0e0e12',
      border: `1px solid ${accent ? `${accent}33` : 'rgba(255,140,60,0.18)'}`,
      borderRadius: 16, padding: '24px 28px',
      boxShadow: accent ? `inset 0 0 40px ${accent}08` : 'none',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: accent || '#ff8c3c', marginBottom: 10, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#71717a', marginBottom: progress ? 14 : 0 }}>{sub}</div>}
      {progress && <ProgressBar {...progress} />}
      {children}
    </div>
  )
}

// ─── Mini card ─────────────────────────────────────────────────────────────────
function MiniCard({ label, value, sub, color, badge }) {
  return (
    <div style={{
      background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </div>
        {badge && (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: `${badge.color}22`, color: badge.color, letterSpacing: '0.08em',
          }}>
            {badge.text}
          </div>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color || '#fff', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#52525b' }}>{sub}</div>}
    </div>
  )
}

// ─── Gráfico horizontal de lotes ──────────────────────────────────────────────
function LotesChart({ lotes }) {
  if (!lotes || lotes.length === 0) return null
  return (
    <div style={{ background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', marginBottom: 20, textTransform: 'uppercase' }}>
        Vendas por lote
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {lotes.map((l) => {
          const color = l.encerrado ? '#22c55e' : l.pct >= 60 ? '#eab308' : '#ff8c3c'
          return (
            <div key={l.id}>
              {/* Label row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{l.nome}</span>
                  <span style={{ fontSize: 10, color: '#52525b' }}>R${l.preco}</span>
                  {l.encerrado && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      encerrado
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color }}>
                    {l.pct}%
                  </span>
                  <span style={{ fontSize: 11, color: '#52525b' }}>
                    {l.vendidas}/{l.vagas_max}
                  </span>
                </div>
              </div>
              {/* Barra horizontal */}
              <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${l.pct}%`,
                  background: color,
                  borderRadius: 10,
                  transition: 'width 0.5s ease',
                  boxShadow: `0 0 8px ${color}55`,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Gráfico de barras SVG ─────────────────────────────────────────────────────
function BarChart({ dias, metaDiaria }) {
  const W = 700, H = 180, PAD = { top: 16, right: 12, bottom: 32, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (!dias || dias.length === 0) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 12 }}>
        Sem dados ainda
      </div>
    )
  }

  const maxVal = Math.max(metaDiaria || 0, ...dias.map((d) => d.total)) || 1
  const barW = Math.max(4, Math.floor((innerW / dias.length) * 0.6))
  const gap = innerW / dias.length

  const yScale = (v) => innerH - (v / maxVal) * innerH

  // Linhas horizontais
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal]

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, fontFamily: "'JetBrains Mono', monospace" }}>
        {/* Grid lines */}
        {yTicks.map((t) => {
          const y = PAD.top + yScale(t)
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end"
                fill="#3f3f46" fontSize={9}>{t}</text>
            </g>
          )
        })}

        {/* Linha de meta diária */}
        {metaDiaria > 0 && (
          <g>
            <line
              x1={PAD.left} y1={PAD.top + yScale(metaDiaria)}
              x2={PAD.left + innerW} y2={PAD.top + yScale(metaDiaria)}
              stroke="#ff8c3c" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.7}
            />
            <text x={PAD.left + innerW + 4} y={PAD.top + yScale(metaDiaria) + 4}
              fill="#ff8c3c" fontSize={9} opacity={0.8}>meta</text>
          </g>
        )}

        {/* Barras */}
        {dias.map((d, i) => {
          const x = PAD.left + i * gap + gap / 2
          const isToday = d.date === new Date().toISOString().slice(0, 10)

          const hImersao = (d.imersao / maxVal) * innerH
          const hMesa = (d.mesa / maxVal) * innerH
          const hBump = (d.order_bump / maxVal) * innerH

          const yBase = PAD.top + innerH

          return (
            <g key={d.date}>
              {/* Order bump (base) */}
              {d.order_bump > 0 && (
                <rect
                  x={x - barW / 2} y={yBase - hBump}
                  width={barW} height={hBump}
                  fill="#3f3f46" rx={2}
                />
              )}
              {/* Imersão (meio) */}
              {d.imersao > 0 && (
                <rect
                  x={x - barW / 2} y={yBase - hBump - hImersao}
                  width={barW} height={hImersao}
                  fill={isToday ? '#ff8c3c' : '#b45309'} rx={2}
                  opacity={isToday ? 1 : 0.8}
                />
              )}
              {/* Mesa (topo) */}
              {d.mesa > 0 && (
                <rect
                  x={x - barW / 2} y={yBase - hBump - hImersao - hMesa}
                  width={barW} height={hMesa}
                  fill="#ef4444" rx={2}
                />
              )}
              {/* Highlight hoje */}
              {isToday && (
                <rect
                  x={x - barW / 2 - 2} y={PAD.top}
                  width={barW + 4} height={innerH}
                  fill="#ff8c3c" opacity={0.06} rx={3}
                />
              )}
              {/* Label data */}
              <text x={x} y={PAD.top + innerH + 18} textAnchor="middle"
                fill={isToday ? '#ff8c3c' : '#52525b'} fontSize={9} fontWeight={isToday ? 700 : 400}>
                {fmtDia(d.date)}
              </text>
              {/* Valor total acima da barra */}
              {d.total > 0 && (
                <text x={x} y={yBase - hBump - hImersao - hMesa - 4}
                  textAnchor="middle" fill={isToday ? '#ff8c3c' : '#a1a1aa'} fontSize={9} fontWeight={700}>
                  {d.total}
                </text>
              )}
            </g>
          )
        })}

        {/* Eixo X */}
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      </svg>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#ff8c3c', borderRadius: 2, display: 'inline-block' }} />
          Imersão (hoje)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#b45309', borderRadius: 2, display: 'inline-block' }} />
          Imersão
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2, display: 'inline-block' }} />
          Mesa
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#3f3f46', borderRadius: 2, display: 'inline-block' }} />
          Order bump
        </span>
        {metaDiaria > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, background: '#ff8c3c', display: 'inline-block', opacity: 0.7 }} />
            Meta/dia
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Funil (imersão → order bump → mesa) ──────────────────────────────────────
function FunnelCard({ kpis }) {
  if (!kpis) return null
  const imersao = kpis.vendas_imersao || 0
  const bump = kpis.vendas_order_bump || 0
  const mesa = kpis.vendas_mesa || 0
  const bumpPct = imersao > 0 ? Math.round((bump / imersao) * 100) : 0
  const mesaPct = imersao > 0 ? Math.round((mesa / imersao) * 100) : 0

  const steps = [
    { label: 'Imersão', value: imersao, pct: 100, color: '#ff8c3c', sub: 'ingressos vendidos' },
    { label: 'Order Bump', value: bump, pct: bumpPct, color: bumpPct >= 30 ? '#22c55e' : bumpPct >= 15 ? '#eab308' : '#ef4444', sub: `${bumpPct}% de conversão` },
    { label: 'Mesa de Comando', value: mesa, pct: mesaPct, color: mesa >= 10 ? '#22c55e' : '#eab308', sub: `${mesaPct}% dos compradores` },
  ]

  return (
    <div style={{
      background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '24px 28px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', marginBottom: 20, textTransform: 'uppercase' }}>
        Funil de Conversão
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((s, i) => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7' }}>{s.label}</span>
                <span style={{ fontSize: 11, color: '#52525b', marginLeft: 10 }}>{s.sub}</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${s.pct}%`,
                background: s.color,
                borderRadius: 6,
                transition: 'width 0.5s ease',
                boxShadow: `0 0 8px ${s.color}55`,
              }} />
            </div>
            {i < steps.length - 1 && (
              <div style={{ textAlign: 'center', color: '#3f3f46', fontSize: 16, marginTop: 6 }}>↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Painel de Metas ───────────────────────────────────────────────────────────
const META_LABELS = {
  ingressos_meta_total: 'Ingressos meta total',
  faturamento_ingresso_meta: 'Fat. ingresso (R$)',
  order_bump_pct_meta: 'Order bump meta (%)',
  mesa_vendas_meta: 'Mesa meta (qtd)',
  investimento_meta_ads: 'Investimento Ads (R$)',
  cpa_alvo: 'CPA alvo (R$)',
  mentoria_vendas_meta: 'Mentoria meta (qtd)',
  mentoria_preco: 'Mentoria preço (R$)',
  faturamento_total_meta: 'Faturamento TOTAL meta',
  roas_meta: 'ROAS meta',
}

function MetasPanel({ token }) {
  const [metas, setMetas] = useState([])
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/dashboard/metas?token=${encodeURIComponent(token)}`)
      const j = await r.json()
      setMetas(j.metas || [])
      const d = {}
      for (const m of j.metas || []) d[m.chave] = String(m.valor)
      setDrafts(d)
    } catch {}
    setLoading(false)
  }

  async function save(chave) {
    const valor = Number(drafts[chave])
    if (!Number.isFinite(valor)) return
    setSaving(chave)
    try {
      await fetch(`/api/dashboard/metas?token=${encodeURIComponent(token)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, valor }),
      })
      await load()
    } catch {}
    setSaving(null)
  }

  // Mostra só chaves que têm label definida (as mais importantes)
  const visibles = metas.filter((m) => META_LABELS[m.chave])

  return (
    <div style={{
      background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '24px 28px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', marginBottom: 20, textTransform: 'uppercase' }}>
        Metas editáveis
      </div>
      {loading ? (
        <div style={{ color: '#52525b', fontSize: 12 }}>Carregando...</div>
      ) : visibles.length === 0 ? (
        <div style={{ color: '#52525b', fontSize: 12 }}>Rode <code>npm run seed:metas</code> primeiro.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibles.map((m) => (
            <div key={m.chave} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#71717a' }}>{META_LABELS[m.chave]}</div>
              <input
                type="number" step="0.01"
                value={drafts[m.chave] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [m.chave]: e.target.value }))}
                style={{
                  background: '#18181b', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, color: '#fff', fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, padding: '4px 8px', width: 90, outline: 'none',
                }}
              />
              <button
                disabled={saving === m.chave || String(m.valor) === drafts[m.chave]}
                onClick={() => save(m.chave)}
                style={{
                  background: saving === m.chave ? 'rgba(255,140,60,0.1)' : 'rgba(255,140,60,0.2)',
                  border: '1px solid rgba(255,140,60,0.3)', borderRadius: 6,
                  color: '#ff8c3c', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                  padding: '4px 10px', cursor: 'pointer', opacity: saving === m.chave ? 0.5 : 1,
                }}
              >
                {saving === m.chave ? '…' : '✓'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tabela de Vendas ──────────────────────────────────────────────────────────
function VendasTable({ token }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 30

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ token, limit: String(limit), offset: String(offset) })
      if (filter) p.set('produto_tipo', filter)
      const r = await fetch(`/api/dashboard/vendas?${p}`)
      const j = await r.json()
      setRows(j.vendas || [])
      setTotal(j.total || 0)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, offset])

  function exportCSV() {
    const headers = ['created_at','produto_tipo','lote_id','valor','email','nome','telefone','utm_source','utm_medium','utm_campaign','fbclid','meta_capi_sent','ticto_transaction_id']
    const esc = (v) => {
      if (v == null) return ''
      const s = String(v)
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? '"' + s.replace(/"/g, '""') + '"'
        : s
    }
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `vendas-${new Date().toISOString().slice(0,10)}.csv`,
    })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const tdStyle = { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: '#d4d4d8', verticalAlign: 'middle' }
  const thStyle = { padding: '8px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525b', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }

  return (
    <div style={{ background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', textTransform: 'uppercase' }}>
          Vendas ({total})
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', 'imersao', 'order_bump', 'mesa'].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setOffset(0) }} style={{
              background: filter === f ? 'rgba(255,140,60,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === f ? 'rgba(255,140,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6, color: filter === f ? '#ff8c3c' : '#71717a',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              padding: '5px 12px', cursor: 'pointer',
            }}>
              {f === '' ? 'Todos' : f === 'imersao' ? 'Imersão' : f === 'order_bump' ? 'Order Bump' : 'Mesa'}
            </button>
          ))}
          <button onClick={exportCSV} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: '#71717a', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700, padding: '5px 12px', cursor: 'pointer',
          }}>↓ CSV</button>
        </div>
      </div>

      {loading ? <div style={{ color: '#52525b', fontSize: 12 }}>Carregando...</div> : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead>
            <tr>
              {['Data/hora', 'Produto', 'Valor', 'Email', 'UTM Source', 'CAPI', 'Sessão'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const data = v.created_at ? new Date(v.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
              const produto = v.produto_tipo === 'imersao'
                ? `Imersão L${v.lote_id ?? '?'}`
                : v.produto_tipo === 'mesa'
                ? 'Mesa'
                : 'Order bump'
              return (
                <tr key={v.id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,140,60,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#71717a' }}>{data}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: v.produto_tipo === 'mesa' ? 'rgba(239,68,68,0.15)' : v.produto_tipo === 'imersao' ? 'rgba(255,140,60,0.15)' : 'rgba(82,82,91,0.2)',
                      color: v.produto_tipo === 'mesa' ? '#ef4444' : v.produto_tipo === 'imersao' ? '#ff8c3c' : '#71717a',
                    }}>{produto}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtBRL(v.valor)}</td>
                  <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.email || '-'}</td>
                  <td style={{ ...tdStyle, color: '#71717a' }}>{v.utm_source || '-'}</td>
                  <td style={tdStyle}>
                    {v.meta_capi_sent === true
                      ? <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
                      : v.meta_capi_sent === false
                      ? <span style={{ color: '#ef4444', fontSize: 14 }} title={JSON.stringify(v.meta_capi_error || {})}>✗</span>
                      : <span style={{ color: '#3f3f46' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, color: '#3f3f46', fontSize: 10 }}>
                    {v.session_id ? '✓' : '—'}
                  </td>
                </tr>
              )
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#3f3f46' }}>Nenhuma venda</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 11, color: '#52525b' }}>{offset + 1}–{Math.min(offset + rows.length, total)} de {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '5px 12px', cursor: 'pointer' }}>
              ‹ Anterior
            </button>
            <button disabled={offset + rows.length >= total} onClick={() => setOffset(offset + limit)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '5px 12px', cursor: 'pointer' }}>
              Próxima ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard principal ───────────────────────────────────────────────────────
function Dashboard({ token, onLogout }) {
  const [overview, setOverview] = useState(null)
  const [diasData, setDiasData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/dashboard/overview?token=${encodeURIComponent(token)}`),
        fetch(`/api/dashboard/vendas-por-dia?token=${encodeURIComponent(token)}&days=14`),
      ])
      if (r1.status === 401) { onLogout(); return }
      const [j1, j2] = await Promise.all([r1.json(), r2.json()])
      if (!r1.ok) throw new Error(j1.error || `HTTP ${r1.status}`)
      setOverview(j1)
      setDiasData(j2.dias || [])
      setLastUpdate(new Date())
      setErr(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, onLogout])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const kpis = overview?.kpis
  const lote = overview?.lote_atual
  const mesa = overview?.mesa_config
  const redis = overview?.contadores_redis
  const lotesBreakdown = overview?.lotes_breakdown || []

  // Meta total de ingressos (não temos ainda sem buscar metas, usamos fallback)
  // Buscamos metaDiaria do endpoint de metas (lazy)
  const [metaTotal, setMetaTotal] = useState(null)
  useEffect(() => {
    fetch(`/api/dashboard/metas?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        const m = (j.metas || []).find((x) => x.chave === 'ingressos_meta_total')
        if (m) setMetaTotal(Number(m.valor))
      })
      .catch(() => {})
  }, [token])

  const dias = daysUntilEvent()
  const vendas = kpis?.vendas_imersao || 0
  const restantes = metaTotal ? Math.max(0, metaTotal - vendas) : null
  const metaDiaria = (dias > 0 && restantes != null) ? Math.ceil(restantes / dias) : null

  // Vendas hoje do gráfico
  const hoje = diasData?.find((d) => d.date === new Date().toISOString().slice(0, 10))
  const vendasHoje = hoje?.imersao || 0

  // Lote: vagas restantes
  const vagasRestantes = lote ? lote.vagas_max - lote.vendas_no_lote : null

  // Order bump conv%
  const bumpConv = vendas > 0 ? Math.round(((kpis?.vendas_order_bump || 0) / vendas) * 100) : 0

  const S = { fontFamily: "'JetBrains Mono', monospace", color: '#e4e4e7' }

  return (
    <div style={{ minHeight: '100vh', background: '#070709', ...S }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(7,7,9,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,140,60,0.12)',
        padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#ff8c3c', fontWeight: 900, fontSize: 13, letterSpacing: '0.12em' }}>ADMIN</span>
          <span style={{ color: '#3f3f46', fontSize: 12 }}>Claude Code · Gestores de Tráfego</span>
          {dias > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: dias <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(255,140,60,0.15)',
              color: dias <= 3 ? '#ef4444' : '#ff8c3c', letterSpacing: '0.08em',
            }}>
              {dias}d para o evento
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: '#52525b' }}>
              {loading ? '↻ atualizando…' : `atualizado às ${fmtHora(lastUpdate.toISOString())}`}
            </span>
          )}
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#a1a1aa', fontFamily: 'inherit', fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
            ↻
          </button>
          <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#52525b', fontFamily: 'inherit', fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
            sair
          </button>
        </div>
      </div>

      {err && (
        <div style={{ margin: '16px 28px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 12 }}>
          Erro: {err}
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Linha 1: 3 hero cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* Lote atual */}
          <HeroCard
            label={lote ? `Lote atual · ${lote.nome}` : 'Lote atual'}
            value={lote ? fmtBRL(lote.preco) : '—'}
            sub={vagasRestantes != null ? `${vagasRestantes} vagas restantes · ${lote.vendas_no_lote}/${lote.vagas_max} vendidas` : ''}
            progress={lote ? { value: lote.vendas_no_lote, max: lote.vagas_max, showLabel: true } : null}
            accent="#ff8c3c"
          />

          {/* Faturamento */}
          <HeroCard
            label="Faturamento total"
            value={kpis ? fmtBRL(kpis.faturamento_total) : '—'}
            sub={kpis ? `ticket médio ${fmtBRLDec(kpis.ticket_medio)}` : ''}
            accent="#22c55e"
          >
            {kpis && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Imersão', val: kpis.faturamento_por_produto?.imersao, color: '#ff8c3c' },
                  { label: 'Order bump', val: kpis.faturamento_por_produto?.order_bump, color: '#71717a' },
                  { label: 'Mesa', val: kpis.faturamento_por_produto?.mesa, color: '#ef4444' },
                ].map((x) => (
                  <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#71717a' }}>
                    <span>{x.label}</span>
                    <span style={{ color: x.color, fontWeight: 700 }}>{fmtBRL(x.val)}</span>
                  </div>
                ))}
              </div>
            )}
          </HeroCard>

          {/* Meta do dia */}
          {(() => {
            const barColor = metaDiaria == null ? '#eab308'
              : vendasHoje >= metaDiaria ? '#22c55e'
              : vendasHoje >= metaDiaria * 0.5 ? '#eab308'
              : '#ef4444'
            const pct = metaDiaria > 0 ? Math.min(100, Math.round((vendasHoje / metaDiaria) * 100)) : 0
            return (
              <div style={{
                background: '#0e0e12',
                border: `1px solid ${barColor}33`,
                borderRadius: 16, padding: '24px 28px',
                boxShadow: `inset 0 0 40px ${barColor}08`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: barColor, marginBottom: 10, textTransform: 'uppercase' }}>
                  Meta do dia · {dias}d até 25/04
                </div>

                {metaDiaria == null ? (
                  <div style={{ fontSize: 14, color: '#52525b', lineHeight: 1.5 }}>
                    Configure <code style={{ color: '#ff8c3c' }}>ingressos_meta_total</code> nas metas abaixo
                  </div>
                ) : (
                  <>
                    {/* Número principal */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{vendasHoje}</span>
                      <span style={{ fontSize: 18, color: '#52525b', fontWeight: 700 }}>de {metaDiaria}</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: barColor, marginLeft: 4 }}>{pct}%</span>
                    </div>

                    {/* Subtexto */}
                    <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>
                      vendas hoje · faltam <span style={{ color: '#e4e4e7', fontWeight: 700 }}>{restantes}</span> ingressos no total
                    </div>

                    {/* Barra */}
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: barColor,
                        borderRadius: 8, transition: 'width 0.5s ease',
                        boxShadow: `0 0 8px ${barColor}66`,
                      }} />
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </div>

        {/* ── Linha 2: 4 mini cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <MiniCard
            label="Imersão (total)"
            value={kpis?.vendas_imersao ?? '—'}
            sub={redis ? `redis: ${redis.imersao}` : ''}
            badge={{ text: metaTotal ? `${Math.round((vendas / metaTotal) * 100)}% da meta` : 'meta não set', color: metaTotal && vendas / metaTotal >= 0.7 ? '#22c55e' : '#eab308' }}
          />
          <MiniCard
            label="Order Bump"
            value={kpis?.vendas_order_bump ?? '—'}
            sub={`${bumpConv}% de conversão`}
            color={bumpConv >= 30 ? '#22c55e' : bumpConv >= 15 ? '#eab308' : '#ef4444'}
            badge={{ text: bumpConv >= 30 ? 'ótimo' : bumpConv >= 15 ? 'médio' : 'baixo', color: bumpConv >= 30 ? '#22c55e' : bumpConv >= 15 ? '#eab308' : '#ef4444' }}
          />
          <MiniCard
            label="Mesa de Comando"
            value={`${kpis?.vendas_mesa ?? 0}/${mesa?.total ?? 15}`}
            sub={`${mesa?.restantes ?? 0} vagas restantes`}
            color={kpis?.vendas_mesa >= 10 ? '#22c55e' : '#eab308'}
          />
          <MiniCard
            label="CAPI OK"
            value={kpis ? `${kpis.capi_sucesso_pct}%` : '—'}
            sub="eventos enviados com sucesso"
            color={kpis?.capi_sucesso_pct >= 80 ? '#22c55e' : '#ef4444'}
            badge={{ text: kpis?.capi_sucesso_pct >= 80 ? 'ok' : 'verificar', color: kpis?.capi_sucesso_pct >= 80 ? '#22c55e' : '#ef4444' }}
          />
        </div>

        {/* ── Linha 3: gráfico diário + funil ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', marginBottom: 20, textTransform: 'uppercase' }}>
              Vendas por dia · últimos 14 dias
            </div>
            <BarChart dias={diasData} metaDiaria={metaDiaria} />
          </div>
          <FunnelCard kpis={kpis} />
        </div>

        {/* ── Linha 4: lotes + metas ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <LotesChart lotes={lotesBreakdown} />
          <MetasPanel token={token} />
        </div>

        {/* ── Linha 5: tabela de vendas ── */}
        <VendasTable token={token} />

      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AppAdmin() {
  const [token, setToken] = useState(() => {
    const fromUrl = getTokenFromUrl()
    if (fromUrl) { try { sessionStorage.setItem(TOKEN_KEY, fromUrl) } catch {} return fromUrl }
    try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
  })

  const login = (t) => { try { sessionStorage.setItem(TOKEN_KEY, t) } catch {} setToken(t) }
  const logout = () => { try { sessionStorage.removeItem(TOKEN_KEY) } catch {} setToken(null) }

  return token ? <Dashboard token={token} onLogout={logout} /> : <AuthScreen onSubmit={login} />
}
