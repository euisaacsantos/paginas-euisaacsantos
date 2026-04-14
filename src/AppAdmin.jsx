import { useCallback, useEffect, useState } from 'react'
import KpiCard from './components/admin/KpiCard.jsx'
import MetasPanel from './components/admin/MetasPanel.jsx'
import FaturamentoPanel from './components/admin/FaturamentoPanel.jsx'
import VendasTable from './components/admin/VendasTable.jsx'

const TOKEN_KEY = 'cct_admin_token'

function getTokenFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search)
    return p.get('token') || null
  } catch {
    return null
  }
}

function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  })
}
function fmtHora(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function AuthScreen({ onSubmit }) {
  const [val, setVal] = useState('')
  return (
    <div className="admin-auth-screen">
      <div className="tech-card" style={{ maxWidth: 420, width: '100%' }}>
        <div className="kpi-label" style={{ color: '#ff8c3c', marginBottom: 12 }}>ADMIN · ACESSO RESTRITO</div>
        <p className="kpi-sub" style={{ marginBottom: 16 }}>
          Cole o token de admin abaixo. Ele fica salvo só nesta sessão (some ao fechar a aba).
        </p>
        <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()) }}>
          <input
            type="password"
            className="metas-input"
            placeholder="ADMIN_SECRET"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
            autoFocus
          />
          <button type="submit" className="metas-save" style={{ width: '100%' }}>Entrar</button>
        </form>
      </div>
    </div>
  )
}

function Dashboard({ token, onLogout }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/overview?token=${encodeURIComponent(token)}`)
      if (res.status === 401) {
        setErr('401 unauthorized — token inválido')
        onLogout()
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = await res.json()
      setData(j)
      setErr(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, onLogout])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const kpis = data?.kpis
  const lote = data?.lote_atual
  const mesa = data?.mesa_config
  const contadores = data?.contadores_redis

  return (
    <div style={{ minHeight: '100vh', background: '#09090B', color: '#fff', padding: '0' }}>
      <div className="admin-topbar">
        <div>
          <span style={{ color: '#ff8c3c', fontWeight: 900, letterSpacing: '0.08em' }}>ADMIN</span>
          <span style={{ opacity: 0.4, margin: '0 12px' }}>·</span>
          <span>Claude Code p/ Gestores de Tráfego</span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span className="kpi-sub">
            {loading ? 'carregando...' : data ? `atualizado ${fmtHora(data.atualizado_em)}` : 'sem dados'}
          </span>
          <button className="metas-save" onClick={load}>↻</button>
          <button className="metas-save" onClick={onLogout}>sair</button>
        </div>
      </div>

      {err ? (
        <div style={{ maxWidth: 1300, margin: '16px auto', padding: '0 16px' }}>
          <div className="tech-card" style={{ borderColor: '#ef4444' }}>
            <span style={{ color: '#ef4444' }}>Erro: {err}</span>
          </div>
        </div>
      ) : null}

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
        <div className="admin-grid">
          <KpiCard
            label={lote ? lote.nome.toUpperCase() : 'LOTE'}
            value={lote ? fmtBRL(lote.preco) : '-'}
            sub={lote ? `${lote.vendas_no_lote}/${lote.vagas_max} · ${lote.pct_vendido}%` : ''}
          />
          <KpiCard
            label="VENDAS IMERSÃO"
            value={kpis?.vendas_imersao ?? '-'}
            sub={contadores ? `redis: ${contadores.imersao}` : ''}
          />
          <KpiCard
            label="ORDER BUMPS"
            value={kpis?.vendas_order_bump ?? '-'}
          />
          <KpiCard
            label="MESA"
            value={`${kpis?.vendas_mesa ?? 0}/${mesa?.total ?? 15}`}
            sub={mesa ? `${mesa.restantes} restantes` : ''}
          />
          <KpiCard
            label="TICKET MÉDIO"
            value={kpis ? fmtBRL(kpis.ticket_medio) : '-'}
            accent="red"
          />
          <KpiCard
            label="FATURAMENTO"
            value={kpis ? fmtBRL(kpis.faturamento_total) : '-'}
            accent="green"
          />
        </div>

        <div className="admin-two-col" style={{ marginTop: 20 }}>
          <MetasPanel token={token} />
          <FaturamentoPanel kpis={kpis} />
        </div>

        <div style={{ marginTop: 20 }}>
          <VendasTable token={token} />
        </div>
      </div>
    </div>
  )
}

export default function AppAdmin() {
  const [token, setToken] = useState(() => {
    const fromUrl = getTokenFromUrl()
    if (fromUrl) {
      try { sessionStorage.setItem(TOKEN_KEY, fromUrl) } catch {}
      return fromUrl
    }
    try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
  })

  const handleLogin = (t) => {
    try { sessionStorage.setItem(TOKEN_KEY, t) } catch {}
    setToken(t)
  }
  const handleLogout = () => {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch {}
    setToken(null)
  }

  if (!token) return <AuthScreen onSubmit={handleLogin} />
  return <Dashboard token={token} onLogout={handleLogout} />
}
