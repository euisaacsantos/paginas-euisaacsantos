import { useEffect, useRef, useState } from 'react'

/**
 * Polling leve de /api/vendas-live.
 * - Primeiro fetch só após `intervalMs` (não bloqueia render).
 * - Pausa quando a aba fica oculta (Page Visibility API).
 * - Detecta delta positivo em imersao/mesa e dispara onIncrement.
 * - A cada poll dispara onUpdate com {imersao, mesa} atuais (pra atualizar barras/pct/lote).
 * - Fallback silencioso (não exibe erro).
 *
 * onIncrement({ kind: 'imersao'|'mesa', delta: number, timestamp: number })
 * onUpdate({ imersao: number, mesa: number })
 */
export function useLiveVendas({ intervalMs = 10000, onIncrement, onUpdate, initial } = {}) {
  const [vendas, setVendas] = useState(null)
  const prev = useRef(null)
  const onIncrementRef = useRef(onIncrement)
  const onUpdateRef = useRef(onUpdate)

  // mantém callbacks atualizados sem re-executar o effect
  useEffect(() => { onIncrementRef.current = onIncrement }, [onIncrement])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  // inicializa baseline assim que o config inicial carrega (vem do /api/config)
  // garante que o PRIMEIRO poll de /api/vendas-live já detecta delta corretamente
  useEffect(() => {
    if (initial && !prev.current) {
      prev.current = {
        imersao: Number(initial.imersao) || 0,
        mesa: Number(initial.mesa) || 0,
      }
    }
  }, [initial])

  useEffect(() => {
    let timer = null
    let cancelled = false

    const fetchVendas = async () => {
      try {
        const res = await fetch('/api/vendas-live')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const imersao = Number(data.imersao) || 0
        const mesa = Number(data.mesa) || 0
        const ts = Date.now()
        if (prev.current) {
          const dImersao = imersao - prev.current.imersao
          const dMesa = mesa - prev.current.mesa
          if (dImersao > 0 && typeof onIncrementRef.current === 'function') {
            onIncrementRef.current({ kind: 'imersao', delta: dImersao, timestamp: ts })
          }
          if (dMesa > 0 && typeof onIncrementRef.current === 'function') {
            onIncrementRef.current({ kind: 'mesa', delta: dMesa, timestamp: ts })
          }
        }
        prev.current = { imersao, mesa }
        setVendas({ imersao, mesa })
        if (typeof onUpdateRef.current === 'function') {
          onUpdateRef.current({ imersao, mesa })
        }
      } catch {
        // silencioso
      }
    }

    const start = () => {
      stop()
      timer = setInterval(fetchVendas, intervalMs)
    }
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null }
    }
    const onVis = () => {
      if (document.hidden) {
        stop()
      } else {
        fetchVendas()
        start()
      }
    }

    // primeiro fetch depois do delay inicial pra não impactar load
    const firstDelay = setTimeout(() => {
      fetchVendas()
      start()
    }, intervalMs)

    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      clearTimeout(firstDelay)
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [intervalMs])

  return vendas
}
