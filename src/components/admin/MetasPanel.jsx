import { useEffect, useState } from 'react'

const LABELS = {
  ingressos_meta_total: 'Ingressos (meta total)',
  faturamento_ingresso_meta: 'Faturamento ingresso (R$)',
  order_bump_pct_meta: 'Order bump % (meta)',
  order_bump_faturamento_meta: 'Order bump faturamento (R$)',
  mesa_vendas_meta: 'Mesa vendas (meta)',
  mesa_faturamento_meta: 'Mesa faturamento (R$)',
  investimento_meta_ads: 'Investimento Ads (R$)',
  faturamento_imersao_meta: 'Faturamento imersão (R$)',
  cpa_alvo: 'CPA alvo (R$)',
  presenca_pct_meta: 'Presença % (meta)',
  perda_pitch_pct_meta: 'Perda no pitch % (meta)',
  conversao_pitch_pct_meta: 'Conversão pitch % (meta)',
  mentoria_vendas_meta: 'Mentoria vendas (meta)',
  mentoria_preco: 'Mentoria preço (R$)',
  mentoria_faturamento_meta: 'Mentoria faturamento (R$)',
  faturamento_total_meta: 'Faturamento TOTAL (R$)',
  roas_meta: 'ROAS (meta)',
}

export default function MetasPanel({ token }) {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const [drafts, setDrafts] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/metas?token=${encodeURIComponent(token)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = await res.json()
      setMetas(j.metas || [])
      const d = {}
      for (const m of j.metas || []) d[m.chave] = String(m.valor)
      setDrafts(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function save(chave) {
    const valor = Number(drafts[chave])
    if (!Number.isFinite(valor)) {
      alert('Valor inválido')
      return
    }
    setSaving(chave)
    try {
      const res = await fetch(`/api/dashboard/metas?token=${encodeURIComponent(token)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, valor }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await load()
    } catch (e) {
      alert('Falha: ' + e.message)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="tech-card"><div className="kpi-label">Metas</div><div className="kpi-sub">Carregando...</div></div>
  if (error) return <div className="tech-card"><div className="kpi-label">Metas</div><div className="kpi-sub" style={{color:'#ef4444'}}>Erro: {error}</div></div>

  return (
    <div className="tech-card">
      <div className="kpi-label" style={{ marginBottom: 14, color: '#ff8c3c' }}>METAS (editáveis)</div>
      {metas.length === 0 ? (
        <div className="kpi-sub">Nenhuma meta cadastrada. Rode <code>npm run seed:metas</code>.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {metas.map((m) => (
            <div key={m.chave} className="metas-row">
              <div className="metas-label">{LABELS[m.chave] || m.chave}</div>
              <input
                type="number"
                step="0.01"
                className="metas-input"
                value={drafts[m.chave] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [m.chave]: e.target.value }))}
              />
              <button
                className="metas-save"
                disabled={saving === m.chave || String(m.valor) === drafts[m.chave]}
                onClick={() => save(m.chave)}
              >
                {saving === m.chave ? '...' : 'Salvar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
