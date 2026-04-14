export default function KpiCard({ label, value, sub, delta, accent = 'orange' }) {
  const accentColor =
    accent === 'red' ? '#FF0000' : accent === 'green' ? '#22c55e' : '#ff8c3c'

  return (
    <div className="kpi-card">
      <div className="kpi-label" style={{ color: accentColor }}>{label}</div>
      <div className="kpi-value">{value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
      {delta != null ? (
        <div
          className="kpi-delta"
          style={{ color: delta >= 0 ? '#22c55e' : '#ef4444' }}
        >
          {delta >= 0 ? '+' : ''}{delta}%
        </div>
      ) : null}
    </div>
  )
}
