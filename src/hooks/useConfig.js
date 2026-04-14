import { useEffect, useState } from 'react'

const FALLBACK = {
  imersao: {
    lote_atual: { id: 0, nome: 'Lote 0', preco: 9, vagas_max: 100, checkout: 'https://checkout.ticto.app/OF2C85B97' },
    lotes: [
      { id: 0, nome: 'Lote 0', preco: 9, vagas_max: 100 },
      { id: 1, nome: '1° Lote', preco: 15, vagas_max: 75 },
      { id: 2, nome: '2° Lote', preco: 19, vagas_max: 60 },
      { id: 3, nome: '3° Lote', preco: 27, vagas_max: 50 },
      { id: 4, nome: '4° Lote', preco: 37, vagas_max: 50 },
      { id: 5, nome: '5° Lote', preco: 47, vagas_max: 50 },
    ],
    vendas_totais: 0,
    vendas_no_lote: 0,
    vagas_max_lote: 100,
    pct_vendido: 0,
  },
  mesa: {
    vendas: 0,
    total: 15,
    restantes: 15,
    pct_vendido: 0,
    checkout: 'https://checkout.ticto.app/OE7DEE344',
    offer_code: 'OE7DEE344',
    preco: 497,
  },
}

export function useConfig() {
  const [config, setConfig] = useState(FALLBACK)
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
        setConfig(data)
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

  return { config, loading, error }
}
