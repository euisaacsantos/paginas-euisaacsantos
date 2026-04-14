import { useEffect, useRef, useState } from 'react'

const WINDOW_MS = 5 * 60 * 1000 // 5 min
const DEBOUNCE_MS = 3000
const AUTO_DISMISS_MS = 6000
const LEAVE_MS = 300

function buildText({ kind, deltaNow, windowTotal, lastTs, now }) {
  if (kind === 'mesa') {
    if (deltaNow >= 2) return `🔥 ${deltaNow} pessoas garantiram vaga na Mesa de Comando`
    return '🔥 Alguém acabou de garantir vaga na Mesa de Comando'
  }
  // imersao
  if (windowTotal >= 5 && now - lastTs > 30_000) {
    return `🔥 ${windowTotal} pessoas garantiram vaga nos últimos 5 minutos`
  }
  if (deltaNow >= 2) return `🔥 ${deltaNow} pessoas garantiram vaga agora`
  return '🔥 Alguém acabou de garantir a vaga'
}

/**
 * Toast live no canto inferior esquerdo.
 * Props: event = { kind, delta, timestamp } | null  (vem do useLiveVendas)
 */
export default function LiveToast({ event }) {
  const [current, setCurrent] = useState(null) // { text, kind, id }
  const [leaving, setLeaving] = useState(false)

  const windowRef = useRef([]) // janela deslizante 5min
  const pendingRef = useRef({ imersao: 0, mesa: 0, lastTs: 0 }) // acumulado no debounce
  const debounceTimer = useRef(null)
  const dismissTimer = useRef(null)
  const leaveTimer = useRef(null)

  // cleanup
  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
  }, [])

  useEffect(() => {
    if (!event) return
    const { kind, delta, timestamp } = event
    // adiciona na janela
    windowRef.current.push({ ts: timestamp, delta, kind })
    // acumula no debounce do mesmo kind
    pendingRef.current[kind] = (pendingRef.current[kind] || 0) + delta
    pendingRef.current.lastTs = timestamp

    // reseta timer de debounce
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const now = Date.now()
      // limpa janela
      windowRef.current = windowRef.current.filter((e) => now - e.ts < WINDOW_MS)

      const pendingImersao = pendingRef.current.imersao || 0
      const pendingMesa = pendingRef.current.mesa || 0

      // mesa tem prioridade (é evento mais raro e mais valioso)
      let showKind = null
      let deltaNow = 0
      if (pendingMesa > 0) { showKind = 'mesa'; deltaNow = pendingMesa }
      else if (pendingImersao > 0) { showKind = 'imersao'; deltaNow = pendingImersao }

      if (showKind) {
        const windowTotal = windowRef.current
          .filter((e) => e.kind === showKind)
          .reduce((s, e) => s + e.delta, 0)
        const lastTs = pendingRef.current.lastTs
        const text = buildText({ kind: showKind, deltaNow, windowTotal, lastTs, now })

        // reset pending
        pendingRef.current = { imersao: 0, mesa: 0, lastTs: 0 }

        // mostra toast
        if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
        setLeaving(false)
        setCurrent({ text, kind: showKind, id: now })

        // auto-dismiss
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(() => {
          setLeaving(true)
          leaveTimer.current = setTimeout(() => {
            setCurrent(null)
            setLeaving(false)
          }, LEAVE_MS)
        }, AUTO_DISMISS_MS)
      }
    }, DEBOUNCE_MS)
  }, [event])

  if (!current) return null
  return (
    <div className={`live-toast${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <span className="live-toast-dot" />
      <span className="live-toast-text">{current.text}</span>
    </div>
  )
}
