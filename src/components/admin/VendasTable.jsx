import { useEffect, useState } from 'react'

function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  })
}
function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function toCSV(rows) {
  const headers = [
    'created_at', 'produto_tipo', 'lote_id', 'offer_code', 'valor', 'status',
    'email', 'telefone', 'nome', 'ticto_transaction_id',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid',
    'meta_capi_sent', 'meta_capi_fbtrace_id', 'session_id', 'external_id',
  ]
  const esc = (v) => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(','))
  }
  return lines.join('\n')
}

export default function VendasTable({ token }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterProduto, setFilterProduto] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        token, limit: String(limit), offset: String(offset),
      })
      if (filterProduto) params.set('produto_tipo', filterProduto)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/dashboard/vendas?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = await res.json()
      setRows(j.vendas || [])
      setTotal(j.total || 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [filterProduto, filterStatus, offset])

  function exportCSV() {
    const csv = toCSV(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cct-vendas-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tech-card" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div className="kpi-label" style={{ color: '#ff8c3c' }}>ÚLTIMAS VENDAS ({total})</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="metas-input" value={filterProduto} onChange={(e) => { setFilterProduto(e.target.value); setOffset(0) }}>
            <option value="">Todos produtos</option>
            <option value="imersao">Imersão</option>
            <option value="order_bump">Order bump</option>
            <option value="mesa">Mesa</option>
          </select>
          <select className="metas-input" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setOffset(0) }}>
            <option value="">Todos status</option>
            <option value="approved">approved</option>
            <option value="paid">paid</option>
            <option value="refunded">refunded</option>
          </select>
          <button className="metas-save" onClick={load}>Atualizar</button>
          <button className="metas-save" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {error ? <div className="kpi-sub" style={{ color: '#ef4444' }}>Erro: {error}</div> : null}
      {loading ? <div className="kpi-sub">Carregando...</div> : null}

      {!loading && rows.length === 0 ? <div className="kpi-sub">Nenhuma venda encontrada.</div> : null}

      {rows.length > 0 && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Valor</th>
                <th>Email</th>
                <th>UTM Source</th>
                <th>CAPI</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="admin-table-row">
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(v.created_at)}</td>
                  <td>
                    {v.produto_tipo === 'imersao'
                      ? `imersão · lote ${v.lote_id ?? '-'}`
                      : v.produto_tipo === 'mesa'
                      ? 'mesa de comando'
                      : 'order bump'}
                  </td>
                  <td className="kpi-value-inline">{fmtBRL(v.valor)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.email || '-'}</td>
                  <td>{v.utm_source || '-'}</td>
                  <td>
                    {v.meta_capi_sent === true ? (
                      <span style={{ color: '#22c55e' }}>OK</span>
                    ) : v.meta_capi_sent === false ? (
                      <span style={{ color: '#ef4444' }} title={JSON.stringify(v.meta_capi_error || {})}>ERR</span>
                    ) : (
                      <span style={{ color: '#a1a1aa' }}>-</span>
                    )}
                  </td>
                  <td>{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <span className="kpi-sub">
              {offset + 1}–{Math.min(offset + rows.length, total)} de {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="metas-save" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>‹ Anterior</button>
              <button className="metas-save" disabled={offset + rows.length >= total} onClick={() => setOffset(offset + limit)}>Próxima ›</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
