import { useEffect, useState } from 'react'

const fmtBRL = (n) => (Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0})
const fmtDT  = (iso) => iso ? new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'
const fmtPhone = (t) => {
  if (!t) return '—'
  // Remove tudo que não é dígito ou + inicial, exibe como +5517999999999
  return t.replace(/(?!^\+)[^\d]/g, '')
}

function statusBadge(lead) {
  if (lead.status === 'purchased')     return { label: 'Convertido',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (lead.status === 'pix_generated') return { label: 'PIX aguardando', color: '#eab308', bg: 'rgba(234,179,8,0.12)' }
  return                                      { label: 'Abandonou',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

// Expiração só se aplica a PIX (30min após geração)
function expiresIn(lead) {
  if (lead.status !== 'pix_generated' || !lead.pix_generated_at) return null
  const diff = new Date(lead.pix_generated_at).getTime() + 30 * 60000 - Date.now()
  if (diff <= 0) return 'expirado'
  const m = Math.floor(diff / 60000)
  return m < 60 ? `${m}min` : `${Math.floor(m / 60)}h`
}

function KpiMini({ label, value, color, sub }) {
  return (
    <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(255,140,60,0.18)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(255,140,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 6, color: active ? '#ff8c3c' : '#71717a',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
      padding: '5px 12px', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

export default function LeadsPendentesPanel({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState(null)
  const [status, setStatus]   = useState('')      // '' = pendentes (abandon+pix), 'purchased' = convertidos
  const [produto, setProduto] = useState('')
  const [offset, setOffset]   = useState(0)
  const limit = 30

  async function load() {
    setLoading(true); setErr(null)
    try {
      const p = new URLSearchParams({ token, limit: String(limit), offset: String(offset) })
      if (status)  p.set('status', status)
      if (produto) p.set('produto_tipo', produto)
      const r = await fetch(`/api/dashboard/leads-pendentes?${p}`)
      if (!r.ok) { const j = await r.json(); throw new Error(j.error) }
      setData(await r.json())
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [status, produto, offset])

  const kpis  = data?.kpis  || {}
  const leads = data?.leads || []
  const total = data?.total || 0

  const thStyle = {
    padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: '#52525b',
    borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap',
  }
  const tdStyle = { padding: '10px 14px', fontSize: 12, color: '#d4d4d8', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }

  return (
    <div style={{ background: '#0e0e12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8c3c', textTransform: 'uppercase', marginBottom: 20 }}>
        Leads Pendentes
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KpiMini label="PIX aguardando"  value={kpis.pix_pendente     || 0} color="#eab308" />
        <KpiMini label="Abandonos"       value={kpis.abandon_pendente || 0} color="#ef4444" />
        <KpiMini label="Convertidos"     value={kpis.purchased        || 0} color="#22c55e" />
        <KpiMini label="Valor potencial" value={fmtBRL(kpis.valor_potencial)} color="#ff8c3c" sub="leads ainda ativos" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <FilterBtn active={status === ''}             onClick={() => { setStatus('');             setOffset(0) }}>Pendentes</FilterBtn>
        <FilterBtn active={status === 'pix_generated'} onClick={() => { setStatus('pix_generated'); setOffset(0) }}>PIX</FilterBtn>
        <FilterBtn active={status === 'abandoned_cart'} onClick={() => { setStatus('abandoned_cart'); setOffset(0) }}>Abandono</FilterBtn>
        <FilterBtn active={status === 'purchased'}    onClick={() => { setStatus('purchased');    setOffset(0) }}>Convertidos</FilterBtn>

        <span style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

        <FilterBtn active={produto === ''}           onClick={() => { setProduto('');           setOffset(0) }}>Todos</FilterBtn>
        <FilterBtn active={produto === 'imersao'}    onClick={() => { setProduto('imersao');    setOffset(0) }}>Imersão</FilterBtn>
        <FilterBtn active={produto === 'mesa'}       onClick={() => { setProduto('mesa');       setOffset(0) }}>Mesa</FilterBtn>
        <FilterBtn active={produto === 'order_bump'} onClick={() => { setProduto('order_bump'); setOffset(0) }}>Order bump</FilterBtn>

        <button onClick={load} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto' }}>↻</button>
      </div>

      {err     && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>Erro: {err}</div>}
      {loading && <div style={{ color: '#52525b', fontSize: 12 }}>Carregando…</div>}

      <div className="dash-table-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", minWidth: 700 }}>
          <thead>
            <tr>
              {['Última atualização', 'Status', 'Produto', 'Valor', 'Email', 'Telefone', 'UTM Campaign', 'Expira', 'Sessão'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const s    = statusBadge(lead)
              const exp  = expiresIn(lead)
              const prod = lead.produto_tipo === 'imersao'
                ? `Imersão L${lead.lote_id ?? '?'}`
                : lead.produto_tipo === 'mesa' ? 'Mesa' : 'Order bump'

              return (
                <tr key={lead.id}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,140,60,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdStyle, color: '#71717a' }}>{fmtDT(lead.updated_at)}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: lead.produto_tipo === 'mesa' ? 'rgba(239,68,68,0.15)' : lead.produto_tipo === 'imersao' ? 'rgba(255,140,60,0.15)' : 'rgba(82,82,91,0.2)',
                      color: lead.produto_tipo === 'mesa' ? '#ef4444' : lead.produto_tipo === 'imersao' ? '#ff8c3c' : '#71717a',
                    }}>{prod}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtBRL(lead.valor)}</td>
                  <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.email || '—'}</td>
                  <td style={{ ...tdStyle, color: '#71717a' }}>{fmtPhone(lead.telefone)}</td>
                  <td style={{ ...tdStyle, color: '#71717a' }}>{lead.utm_campaign || '—'}</td>
                  <td style={{ ...tdStyle, color: exp === 'expirado' ? '#3f3f46' : exp ? '#eab308' : '#3f3f46' }}>
                    {lead.status === 'purchased' ? '—' : exp || '—'}
                  </td>
                  <td style={{ ...tdStyle, color: lead.session_id ? '#22c55e' : '#3f3f46', fontSize: 11 }}>
                    {lead.session_id ? '✓' : '—'}
                  </td>
                </tr>
              )
            })}
            {!loading && leads.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#3f3f46' }}>Nenhum lead</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 11, color: '#52525b' }}>{offset+1}–{Math.min(offset+leads.length, total)} de {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}
              style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:'#71717a',fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:'5px 12px',cursor:'pointer' }}>
              ‹ Anterior
            </button>
            <button disabled={offset + leads.length >= total} onClick={() => setOffset(offset + limit)}
              style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:'#71717a',fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:'5px 12px',cursor:'pointer' }}>
              Próxima ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
