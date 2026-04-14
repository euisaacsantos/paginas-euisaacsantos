function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  })
}

export default function FaturamentoPanel({ kpis }) {
  if (!kpis) return null
  const fp = kpis.faturamento_por_produto || {}
  return (
    <div className="tech-card">
      <div className="kpi-label" style={{ marginBottom: 14, color: '#ff8c3c' }}>FATURAMENTO POR PRODUTO</div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="fat-row">
          <span>Ingresso (imersão)</span>
          <span className="kpi-value-inline">{fmtBRL(fp.imersao)}</span>
        </div>
        <div className="fat-row">
          <span>Order bump</span>
          <span className="kpi-value-inline">{fmtBRL(fp.order_bump)}</span>
        </div>
        <div className="fat-row">
          <span>Mesa de Comando</span>
          <span className="kpi-value-inline">{fmtBRL(fp.mesa)}</span>
        </div>
        <div className="fat-row fat-row-total">
          <span>TOTAL</span>
          <span className="kpi-value-inline" style={{ color: '#ff8c3c' }}>{fmtBRL(kpis.faturamento_total)}</span>
        </div>
        <div className="fat-row" style={{ marginTop: 8, opacity: 0.8 }}>
          <span>Ticket médio</span>
          <span className="kpi-value-inline">{fmtBRL(kpis.ticket_medio)}</span>
        </div>
        <div className="fat-row" style={{ opacity: 0.8 }}>
          <span>CAPI sucesso</span>
          <span className="kpi-value-inline">{kpis.capi_sucesso_pct}%</span>
        </div>
      </div>
    </div>
  )
}
