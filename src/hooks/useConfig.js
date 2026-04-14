import { useCallback, useEffect, useState } from 'react'

const FALLBACK_LOTES = [
  { id: 0, nome: 'Lote 0', preco: 9, vagas_max: 100, checkout: 'https://checkout.ticto.app/OF2C85B97', offer_code: 'OF2C85B97' },
  { id: 1, nome: '1° Lote', preco: 15, vagas_max: 75, checkout: 'https://checkout.ticto.app/OE6189E11', offer_code: 'OE6189E11' },
  { id: 2, nome: '2° Lote', preco: 19, vagas_max: 60, checkout: 'https://checkout.ticto.app/O7C22AADF', offer_code: 'O7C22AADF' },
  { id: 3, nome: '3° Lote', preco: 27, vagas_max: 50, checkout: 'https://checkout.ticto.app/OAC031B04', offer_code: 'OAC031B04' },
  { id: 4, nome: '4° Lote', preco: 37, vagas_max: 50, checkout: 'https://checkout.ticto.app/O0B9F3ECB', offer_code: 'O0B9F3ECB' },
  { id: 5, nome: '5° Lote', preco: 47, vagas_max: 50, checkout: 'https://checkout.ticto.app/O7CE6EC04', offer_code: 'O7CE6EC04' },
]

const FALLBACK_MESA_BASE = {
  total: 15,
  checkout: 'https://checkout.ticto.app/OE7DEE344',
  offer_code: 'OE7DEE344',
  preco: 497,
}

function buildConfig(lotes, mesaBase, vendasImersao, vendasMesa) {
  const safeLotes = lotes && lotes.length ? lotes : FALLBACK_LOTES
  let acumulado = 0
  let loteAtual = safeLotes[safeLotes.length - 1]
  let vendasNoLote = Math.min(loteAtual.vagas_max, Math.max(0, vendasImersao))
  for (const l of safeLotes) {
    const end = acumulado + l.vagas_max
    if (vendasImersao < end) {
      loteAtual = l
      vendasNoLote = Math.max(0, vendasImersao - acumulado)
      break
    }
    acumulado = end
  }
  const pctLote = Math.min(100, Math.round((vendasNoLote / Math.max(1, loteAtual.vagas_max)) * 100))

  const mesaTotal = (mesaBase && mesaBase.total) || 15
  const mesaRestantes = Math.max(0, mesaTotal - vendasMesa)
  const mesaPct = Math.min(100, Math.round((vendasMesa / Math.max(1, mesaTotal)) * 100))

  return {
    imersao: {
      lote_atual: loteAtual,
      lotes: safeLotes,
      vendas_totais: vendasImersao,
      vendas_no_lote: vendasNoLote,
      vagas_max_lote: loteAtual.vagas_max,
      pct_vendido: pctLote,
    },
    mesa: {
      ...mesaBase,
      total: mesaTotal,
      vendas: vendasMesa,
      restantes: mesaRestantes,
      pct_vendido: mesaPct,
    },
  }
}

export function useConfig() {
  const [lotes, setLotes] = useState(FALLBACK_LOTES)
  const [mesaBase, setMesaBase] = useState(FALLBACK_MESA_BASE)
  const [vendas, setVendas] = useState({ imersao: 0, mesa: 0 })
  const [vendasIniciais, setVendasIniciais] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/config')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data?.imersao?.lotes?.length) setLotes(data.imersao.lotes)
        if (data?.mesa) {
          setMesaBase({
            total: data.mesa.total || 15,
            checkout: data.mesa.checkout || FALLBACK_MESA_BASE.checkout,
            offer_code: data.mesa.offer_code || FALLBACK_MESA_BASE.offer_code,
            preco: data.mesa.preco || FALLBACK_MESA_BASE.preco,
          })
        }
        const v = {
          imersao: Number(data?.imersao?.vendas_totais) || 0,
          mesa: Number(data?.mesa?.vendas) || 0,
        }
        setVendas(v)
        setVendasIniciais(v)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[useConfig] usando fallback:', err.message)
        setError(err)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const setVendasLive = useCallback((v) => {
    if (!v) return
    setVendas((prev) => ({
      imersao: typeof v.imersao === 'number' ? v.imersao : prev.imersao,
      mesa: typeof v.mesa === 'number' ? v.mesa : prev.mesa,
    }))
  }, [])

  const config = buildConfig(lotes, mesaBase, vendas.imersao, vendas.mesa)

  return { config, loading, error, setVendasLive, vendasIniciais }
}
