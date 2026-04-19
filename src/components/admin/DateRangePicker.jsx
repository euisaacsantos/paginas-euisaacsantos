import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// ─── constantes ───────────────────────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_PT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const today     = new Date(); today.setHours(0,0,0,0)

// ─── utils ────────────────────────────────────────────────────────────────────
function sameDay(a, b) {
  return a && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth()    === b.getMonth()
    && a.getDate()     === b.getDate()
}
function toMidnight(d) {
  const n = new Date(d); n.setHours(0,0,0,0); return n
}
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function fmtShort(d) {
  if (!d) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function toISO(d) {
  if (!d) return null
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

// Retorna array de datas para preencher o calendário do mês (6 linhas × 7 colunas)
function buildCalendar(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month+1, 0)
  const days  = []
  // padding início (domingo = 0)
  for (let i = first.getDay() - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), cur: false })
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), cur: true })
  }
  let pad = 1
  while (days.length < 42) {
    days.push({ date: new Date(year, month+1, pad++), cur: false })
  }
  return days
}

// ─── MonthGrid ────────────────────────────────────────────────────────────────
function MonthGrid({ year, month, start, end, hovered, onHover, onSelect }) {
  const days = buildCalendar(year, month)

  // Computa visual: start/end podem estar em qualquer ordem enquanto o user arrasta
  const lo = start && end ? (start <= end ? start : end) : start
  const hi = start && end ? (start <= end ? end   : start) : null
  // Se só start e tem hover (mostrando range provisório)
  const previewHi = (!hi && hovered && start) ? (hovered >= start ? hovered : null) : null
  const previewLo = (!hi && hovered && start) ? (hovered < start ? hovered : null) : null

  return (
    <div>
      {/* Cabeçalho do mês */}
      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#e4e4e7', marginBottom: 12 }}>
        {MONTHS_PT[month]} {year}
      </div>

      {/* Dias da semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {DAYS_PT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#52525b', fontWeight: 700, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px 0' }}>
        {days.map(({ date, cur }, idx) => {
          const d = toMidnight(date)
          const isToday    = sameDay(d, today)
          const isStart    = sameDay(d, lo) || sameDay(d, previewLo)
          const isEnd      = sameDay(d, hi) || sameDay(d, previewHi)
          const inRange    = (lo && hi && d > lo && d < hi)
            || (!hi && previewHi && start && d > lo && d < previewHi)
          const isSingle   = isStart && isEnd
          const isSelected = isStart || isEnd

          // bordas arredondadas para start/end
          const radiusL = isStart ? '50%' : '0'
          const radiusR = isEnd   ? '50%' : '0'

          // cor de fundo da célula
          const bgCell = inRange ? 'rgba(255,140,60,0.13)' : 'transparent'
          const bgDot  = isSelected
            ? '#ff8c3c'
            : isToday
            ? 'rgba(255,140,60,0.2)'
            : 'transparent'

          return (
            <div
              key={idx}
              onMouseEnter={() => onHover(d)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(d)}
              style={{
                background: bgCell,
                borderRadius: isSingle ? '50%'
                  : isStart ? '50% 0 0 50%'
                  : isEnd   ? '0 50% 50% 0'
                  : '0',
                cursor: 'pointer',
                padding: '1px 0',
              }}
            >
              <div style={{
                width: 32, height: 32, margin: '0 auto',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                background: bgDot,
                boxShadow: isSelected ? '0 0 0 2px rgba(255,140,60,0.4)' : 'none',
                transition: 'background 0.1s',
                position: 'relative',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: isSelected || isToday ? 700 : 400,
                  color: isSelected ? '#fff'
                    : !cur ? '#3f3f46'
                    : isToday ? '#ff8c3c'
                    : '#d4d4d8',
                  lineHeight: 1,
                }}>
                  {date.getDate()}
                </span>
                {/* Ponto de "hoje" */}
                {isToday && !isSelected && (
                  <span style={{
                    position: 'absolute', bottom: 4,
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#ff8c3c',
                  }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────
// Props:
//   value: { start: Date|null, end: Date|null }
//   onChange: ({ start, end, since, until }) => void
//   onClose: () => void (chamado ao confirmar ou clicar fora)
export default function DateRangePicker({ value, onChange, onClose }) {
  const [leftMonth, setLeftMonth] = useState(() => {
    const base = value?.start || today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [start, setStart] = useState(value?.start || null)
  const [end,   setEnd]   = useState(value?.end   || null)
  const [hovered, setHovered] = useState(null)
  const [phase, setPhase] = useState(start && end ? 'done' : start ? 'picking-end' : 'picking-start')
  const ref = useRef(null)

  const rightMonth = addMonths(leftMonth, 1)

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Impede overflow horizontal: corrige posição após render
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const parentLeft = el.offsetParent?.getBoundingClientRect().left ?? 0
    if (rect.left < 8) {
      el.style.right = 'auto'
      el.style.left = `${8 - parentLeft}px`
    } else if (rect.right > window.innerWidth - 8) {
      el.style.right = 'auto'
      el.style.left = `${window.innerWidth - 8 - rect.width - parentLeft}px`
    }
  }, [])

  function handleSelect(d) {
    if (phase === 'picking-start' || phase === 'done') {
      setStart(d); setEnd(null); setPhase('picking-end')
    } else {
      // picking-end
      if (d < start) {
        // inverteu: d vira start, start vira end
        setStart(d); setEnd(start); setPhase('done')
        commit(d, start)
      } else if (sameDay(d, start)) {
        // mesmo dia: confirma como range de um único dia
        setEnd(d); setPhase('done')
        commit(start, d)
      } else {
        setEnd(d); setPhase('done')
        commit(start, d)
      }
    }
  }

  function commit(s, e) {
    onChange?.({ start: s, end: e, since: toISO(s), until: toISO(e) })
  }

  function clearSelection() {
    setStart(null); setEnd(null); setPhase('picking-start')
  }

  const instruction = phase === 'picking-start'
    ? 'Selecione a data inicial'
    : phase === 'picking-end'
    ? 'Selecione a data final'
    : `${fmtShort(start)} → ${fmtShort(end)}`

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        zIndex: 200,
        marginTop: 8,
        background: '#111116',
        border: '1px solid rgba(255,140,60,0.25)',
        borderRadius: 14,
        padding: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: 320,
      }}
    >
      {/* Instrução + clear */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: phase === 'done' ? '#ff8c3c' : '#71717a', fontWeight: phase === 'done' ? 700 : 400 }}>
          {instruction}
        </span>
        {(start || end) && (
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: '#52525b', fontSize: 11, cursor: 'pointer', padding: 0 }}>
            limpar
          </button>
        )}
      </div>

      {/* Navegação mês */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setLeftMonth(addMonths(leftMonth, -1))} style={navBtn}>‹</button>
        <button onClick={() => setLeftMonth(addMonths(leftMonth, 1))}  style={navBtn}>›</button>
      </div>

      {/* Dois calendários lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <MonthGrid
          year={leftMonth.getFullYear()} month={leftMonth.getMonth()}
          start={start} end={end} hovered={hovered}
          onHover={setHovered} onSelect={handleSelect}
        />
        <MonthGrid
          year={rightMonth.getFullYear()} month={rightMonth.getMonth()}
          start={start} end={end} hovered={hovered}
          onHover={setHovered} onSelect={handleSelect}
        />
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
        <button onClick={() => onClose?.()} style={btnSecondary}>Cancelar</button>
        <button
          disabled={!start}
          onClick={() => {
            if (phase === 'picking-end' && start && !end) {
              // aplica como dia único
              commit(start, start)
            }
            onClose?.()
          }}
          style={{ ...btnPrimary, opacity: !start ? 0.4 : 1 }}
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

// ─── estilos locais ───────────────────────────────────────────────────────────
const navBtn = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  color: '#a1a1aa',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  padding: '3px 10px',
  cursor: 'pointer',
}
const btnSecondary = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 7,
  color: '#71717a',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fontWeight: 700,
  padding: '7px 16px',
  cursor: 'pointer',
}
const btnPrimary = {
  background: 'linear-gradient(135deg,#ff8c3c,#e05a00)',
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fontWeight: 700,
  padding: '7px 16px',
  cursor: 'pointer',
}
