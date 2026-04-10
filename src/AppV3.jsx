import { useEffect, useState, useRef } from 'react'

function useTypewriter(fullText, speed = 45, start = true) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!start || i >= fullText.length) return
    const t = setTimeout(() => setI(i + 1), speed)
    return () => clearTimeout(t)
  }, [i, fullText, speed, start])
  return fullText.slice(0, i)
}

function TypeHeading({ text, highlight, className = '', style }) {
  const ref = useRef(null)
  const [start, setStart] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { setStart(true); obs.disconnect() }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const typed = useTypewriter(text, 22, start)
  const hStart = highlight ? text.indexOf(highlight) : -1
  const hEnd = hStart >= 0 ? hStart + highlight.length : -1
  const before = hStart >= 0 ? typed.slice(0, Math.min(typed.length, hStart)) : typed
  const hi = hStart >= 0 ? typed.slice(Math.min(typed.length, hStart), Math.min(typed.length, hEnd)) : ''
  const after = hStart >= 0 ? typed.slice(Math.min(typed.length, hEnd)) : ''
  const done = typed.length >= text.length
  return (
    <h2 ref={ref} className={className} style={style}>
      {before}
      {hStart >= 0 && <span className="highlight-orange">{hi}</span>}
      {after}
      <span className={`typewriter-caret ${done ? 'blink' : ''}`}>|</span>
    </h2>
  )
}

function HeroTitle() {
  const full = 'Pare de subir campanha. Comece a COMANDAR.'
  const typed = useTypewriter(full, 22)
  const raizStart = full.indexOf('COMANDAR')
  const raizEnd = raizStart + 'COMANDAR'.length
  const before = typed.slice(0, Math.min(typed.length, raizStart))
  const raiz = typed.slice(Math.min(typed.length, raizStart), Math.min(typed.length, raizEnd))
  const after = typed.slice(Math.min(typed.length, raizEnd))
  const done = typed.length >= full.length
  return (
    <h1 className="mb-4 md:mb-6 font-black leading-[1.05] tracking-tight hero-title-v1 relative" style={{ whiteSpace: 'pre-line' }}>
      <span aria-hidden="true" className="invisible">
        {'Pare de subir campanha.\nComece a\n'}<span className="highlight-orange">COMANDAR</span>.
      </span>
      <span className="absolute inset-0">
        {before.replace('Comece', '\nComece').replace(/ $/, '\n')}
        <span className="highlight-orange">{raiz}</span>
        {after}
        <span className={`typewriter-caret ${done ? 'blink' : ''}`}>|</span>
      </span>
    </h1>
  )
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useCountdown() {
  const target = new Date('2026-04-25T09:00:00-03:00').getTime()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  let d = Math.max(0, target - now)
  const days = Math.floor(d / 86400000); d -= days * 86400000
  const hours = Math.floor(d / 3600000); d -= hours * 3600000
  const mins = Math.floor(d / 60000); d -= mins * 60000
  const secs = Math.floor(d / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return { days: pad(days), hours: pad(hours), mins: pad(mins), secs: pad(secs) }
}

function Countdown({ compact = false, big = false }) {
  const { days, hours, mins, secs } = useCountdown()
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 text-2xl font-black">
        <span>{days}d</span><span className="text-accent">:</span>
        <span>{hours}h</span><span className="text-accent">:</span>
        <span>{mins}m</span><span className="text-accent">:</span>
        <span>{secs}s</span>
      </div>
    )
  }
  const sizeClass = big ? 'counter-box counter-box--big' : 'counter-box'
  return (
    <div className="countdown-wrap">
      <div className={sizeClass}><span className="counter-num">{days}</span><span className="counter-lbl">Dias</span></div>
      <span className="countdown-sep">:</span>
      <div className={sizeClass}><span className="counter-num">{hours}</span><span className="counter-lbl">Horas</span></div>
      <span className="countdown-sep">:</span>
      <div className={sizeClass}><span className="counter-num">{mins}</span><span className="counter-lbl">Min</span></div>
      <span className="countdown-sep">:</span>
      <div className={sizeClass}><span className="counter-num">{secs}</span><span className="counter-lbl">Seg</span></div>
    </div>
  )
}

const identCards = [
  { t: 'Subindo campanha de madrugada', d: 'Domingo às 23h ainda configurando criativo, conjunto e segmentação porque amanhã o cliente cobra. De novo.' },
  { t: 'Relatório manual toda semana', d: 'Abrir Gerenciador, exportar CSV, formatar planilha, mandar pro WhatsApp do cliente. Você já fez isso 200 vezes esse ano.' },
  { t: 'Conta pausada sem ninguém ver', d: 'Saldo zerou às 3h da tarde, você só viu às 8h da noite, o cliente ligou furioso. Já aconteceu, né?' },
  { t: 'Tentou n8n e quebrou', d: 'Montou 30 nodes, funcionou uma semana, na segunda quebrou e você nunca mais mexeu. O agente virou um problema a mais.' },
  { t: 'Quer escalar e não consegue', d: 'Pra pegar mais cliente, precisa contratar. Pra contratar, precisa formar. E o sócio nunca rende como você.' },
  { t: 'Medo de ficar para trás', d: 'Vê influencer postando agente de IA no Instagram e sente que em 12 meses você vai estar obsoleto.' },
]

const dia1 = [
  'Abertura "Jarvis": você vê um agente Claude Code operando uma conta de Ads por comando de voz, ao vivo',
  'Construção do Agente Subidor: sobe campanha por comando, valida criativo e escolhe público',
  'Como conectar Claude Code ao Meta Ads via MCP (sem precisar programar)',
  'O cérebro Obsidian: agente que nunca esquece nada da sua operação (visual hipnótico ao vivo)',
  'Você sai do bloco com o Subidor rodando na sua máquina',
]
const dia2 = [
  'Construção do Agente Relator: puxa dados toda manhã e envia relatório no WhatsApp do cliente automaticamente',
  'Construção do Agente Vigia: monitora CPA/ROAS em tempo real e alerta quando algo quebra',
  'Skill mestre /diagnostico-conta: um único comando que analisa qualquer conta de Ads',
  'Como empacotar tudo isso como diferencial premium e cobrar 2x mais dos seus clientes',
  'Você sai da imersão com 3 agentes + 1 cérebro Obsidian rodando — sem ter escrito 1 linha de código',
]

const faq = [
  ['Como funciona a imersão?', 'A imersão Claude para Gestores de Tráfego acontece ao vivo no sábado 25 de abril, das 9h às 12h, via plataforma online. Você recebe o link no e-mail após a inscrição.'],
  ['Preciso saber programar?', 'Não. Claude Code é por comando em português. Se você sabe escrever pra um humano, sabe usar. A aula preparatória te deixa pronto em 30 minutos.'],
  ['Funciona com Meta Ads e Google Ads?', 'Sim, ambos. A integração é feita via MCP (Model Context Protocol) — vou te mostrar como configurar passo a passo durante a imersão.'],
  ['E se eu não puder assistir no dia?', 'A imersão é 100% ao vivo. Se você quiser garantir a gravação vitalícia + templates prontos, no checkout tem um pacote especial por +R$27 que inclui tudo isso.'],
  ['Por que R$9?', 'Porque o 1° lote é uma condição especial de lançamento. Quero encher a sala de gestores de verdade. O preço sobe rápido conforme os lotes esgotam.'],
  ['Quais as formas de pagamento?', 'Cartão de crédito, PIX ou boleto. Acesso imediato aos bônus após a confirmação.'],
]

const TERMINAL_SCRIPTS = [
  {
    cmd: 'sobe a campanha do cliente acme com o criativo novo',
    reply: [
      '✓ criativo validado',
      '✓ público lookalike 1% carregado',
      '✓ orçamento R$ 300/dia',
      '→ campanha no ar em 8s. ok chefe.',
    ],
  },
  {
    cmd: 'manda o relatório de hoje pro joão no whatsapp',
    reply: [
      '↻ puxando dados do meta ads...',
      '✓ ROAS 3.4 · CPA R$ 18,20 · 47 conversões',
      '→ relatório enviado pro joão às 09:32 ✓',
    ],
  },
  {
    cmd: 'monitora a conta da loja x e me avisa se o cpa passar de 35',
    reply: [
      '⚡ vigia ativado',
      '↻ checando a cada 5 minutos',
      '→ se passar de R$35, te aviso no whatsapp.',
    ],
  },
  {
    cmd: '/diagnostico-conta cliente-mateus',
    reply: [
      '↻ analisando últimos 30 dias...',
      '⚠ 3 conjuntos com ROAS < 1',
      '⚠ criativo principal em fadiga (CTR -42%)',
      '→ recomendo pausar e duplicar com nova hook.',
    ],
  },
]

function ClaudeTerminal() {
  const [scriptIdx, setScriptIdx] = useState(0)
  const [phase, setPhase] = useState('typing') // typing | reply | erase
  const [cmdText, setCmdText] = useState('')
  const [replyLines, setReplyLines] = useState([])

  const script = TERMINAL_SCRIPTS[scriptIdx]

  useEffect(() => {
    if (phase === 'typing') {
      if (cmdText.length < script.cmd.length) {
        const t = setTimeout(() => setCmdText(script.cmd.slice(0, cmdText.length + 1)), 38)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('reply'), 600)
      return () => clearTimeout(t)
    }
    if (phase === 'reply') {
      if (replyLines.length < script.reply.length) {
        const t = setTimeout(() => setReplyLines(script.reply.slice(0, replyLines.length + 1)), 420)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('erase'), 2200)
      return () => clearTimeout(t)
    }
    if (phase === 'erase') {
      const t = setTimeout(() => {
        setCmdText('')
        setReplyLines([])
        setScriptIdx((i) => (i + 1) % TERMINAL_SCRIPTS.length)
        setPhase('typing')
      }, 200)
      return () => clearTimeout(t)
    }
  }, [phase, cmdText, replyLines, script])

  return (
    <div className="claude-term">
      <div className="claude-term-bar">
        <span className="claude-term-dot claude-term-dot--r" />
        <span className="claude-term-dot claude-term-dot--y" />
        <span className="claude-term-dot claude-term-dot--g" />
        <span className="claude-term-bar-title">claude-code</span>
      </div>
      <div className="claude-term-body">
        <div className="claude-term-header">
          <pre className="claude-term-ascii">{` ▐▛███▜▌
▝▜█████▛▘
  ▘▘ ▝▝  `}</pre>
          <div className="claude-term-meta">
            <p><span className="claude-term-orange">Claude Code</span> v2.1.96</p>
            <p>Opus 4.6 (1M context) · Claude Max</p>
            <p className="claude-term-dim">~/Documents</p>
          </div>
        </div>
        <div className="claude-term-divider" />
        <div className="claude-term-line">
          <span className="claude-term-prompt">{'>'}</span>
          <span className="claude-term-cmd">{cmdText}</span>
          {phase === 'typing' && <span className="claude-term-caret">▍</span>}
        </div>
        <div className="claude-term-reply">
          {replyLines.map((l, i) => (
            <p key={i} className="claude-term-reply-line">{l}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

const BRAIN_LABELS = [
  'campanha-acme', 'criativo-vencedor-3', 'relatorio-joao', 'vigia-loja-x',
  'roas-3.2', 'lookalike-1%', 'publico-frio', 'cpa-alvo', 'briefing-cliente',
  'teste-headline', 'cta-versao-b', 'funil-quente', 'remarketing-vsl',
  'copy-nova', 'meta-pixel', 'utm-cliente-x', 'retencao-d7', 'catalog-feed',
  'idade-25-34', 'conversao-checkout', 'pixel-lead', 'vsl-30s',
  'cliente-mateus', 'dashboard-acme', 'alerta-saldo', 'copy-gancho',
  'meta-ads-api', 'google-ads', 'tiktok-spark', 'reels-organico',
  'newsletter-warm', 'segmento-quente', 'funil-vsl', 'criativo-ugc',
  'teste-thumb', 'campanha-bf', 'orcamento-300', 'public-lookalike-2%'
]

function ObsidianBrain() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H, dpr
    const resize = () => {
      dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let nodes = []
    let edges = []
    let frame = 0
    let lastSpawn = 0
    const MAX = 45

    const spawn = () => {
      if (nodes.length >= MAX) {
        nodes = []
        edges = []
        return
      }
      const n = {
        x: W / 2 + (Math.random() - 0.5) * 60,
        y: H / 2 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        label: BRAIN_LABELS[Math.floor(Math.random() * BRAIN_LABELS.length)],
        born: frame,
        pulse: Math.random() * Math.PI * 2,
      }
      nodes.push(n)
      const idx = nodes.length - 1
      if (idx > 0) {
        const num = Math.min(idx, 1 + Math.floor(Math.random() * 2))
        const used = new Set()
        for (let i = 0; i < num; i++) {
          let t
          do { t = Math.floor(Math.random() * idx) } while (used.has(t))
          used.add(t)
          edges.push({ a: idx, b: t, born: frame })
        }
      }
    }

    spawn()

    let raf
    const tick = () => {
      frame++
      if (frame - lastSpawn > 28) {
        spawn()
        lastSpawn = frame
      }

      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy + 0.01
          const d = Math.sqrt(d2)
          const force = 1400 / d2
          const fx = (dx / d) * force
          const fy = (dy / d) * force
          a.vx -= fx; a.vy -= fy
          b.vx += fx; b.vy += fy
        }
      }
      // attraction along edges
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b]
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01
        const force = (d - 90) * 0.018
        const fx = (dx / d) * force
        const fy = (dy / d) * force
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }
      // center pull, friction, integrate, bounds
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.0018
        n.vy += (H / 2 - n.y) * 0.0018
        n.vx *= 0.86
        n.vy *= 0.86
        n.x += n.vx
        n.y += n.vy
        const m = 36
        if (n.x < m) { n.x = m; n.vx = 0 }
        if (n.x > W - m) { n.x = W - m; n.vx = 0 }
        if (n.y < m) { n.y = m; n.vy = 0 }
        if (n.y > H - m) { n.y = H - m; n.vy = 0 }
      }

      // draw
      ctx.clearRect(0, 0, W, H)
      // edges
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b]
        if (!a || !b) continue
        const age = Math.min(1, (frame - e.born) / 25)
        ctx.strokeStyle = `rgba(255, 140, 60, ${0.18 * age})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      // nodes
      for (const n of nodes) {
        const age = Math.min(1, (frame - n.born) / 25)
        n.pulse += 0.05
        const r = 3.6 + Math.sin(n.pulse) * 0.7
        // glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5)
        grad.addColorStop(0, `rgba(255, 140, 60, ${0.55 * age})`)
        grad.addColorStop(1, 'rgba(255, 140, 60, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(n.x, n.y, r * 5, 0, Math.PI * 2)
        ctx.fill()
        // core
        ctx.fillStyle = `rgba(255, 195, 120, ${age})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()
        // label
        if (age > 0.5) {
          ctx.fillStyle = `rgba(190, 190, 190, ${(age - 0.5) * 0.85})`
          ctx.font = '10px ui-monospace, "JetBrains Mono", monospace'
          ctx.textAlign = 'center'
          ctx.fillText(n.label, n.x, n.y - 9)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="obsidian-brain" />
}

function CtaProgress() {
  return (
    <div className="cta-progress">
      <div className="cta-progress-bar"><div className="cta-progress-fill" /></div>
      <div className="cta-progress-label">
        <strong>LOTE 0</strong>
        <span>74% dos ingressos vendidos</span>
      </div>
    </div>
  )
}

function ClaudeTerminalMini() {
  const [scriptIdx, setScriptIdx] = useState(0)
  const [phase, setPhase] = useState('typing')
  const [cmdText, setCmdText] = useState('')
  const [replyLines, setReplyLines] = useState([])
  const script = TERMINAL_SCRIPTS[scriptIdx]
  useEffect(() => {
    if (phase === 'typing') {
      if (cmdText.length < script.cmd.length) {
        const t = setTimeout(() => setCmdText(script.cmd.slice(0, cmdText.length + 1)), 38)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('reply'), 600)
      return () => clearTimeout(t)
    }
    if (phase === 'reply') {
      if (replyLines.length < script.reply.length) {
        const t = setTimeout(() => setReplyLines(script.reply.slice(0, replyLines.length + 1)), 420)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('erase'), 2200)
      return () => clearTimeout(t)
    }
    if (phase === 'erase') {
      const t = setTimeout(() => {
        setCmdText('')
        setReplyLines([])
        setScriptIdx((i) => (i + 1) % TERMINAL_SCRIPTS.length)
        setPhase('typing')
      }, 200)
      return () => clearTimeout(t)
    }
  }, [phase, cmdText, replyLines, script])
  return (
    <div className="claude-term-mini">
      <div className="claude-term-mini-header">
        <pre className="claude-term-mini-ascii">{` ▐▛███▜▌
▝▜█████▛▘`}</pre>
        <div className="claude-term-mini-meta">
          <p><span className="claude-term-mini-orange">Claude Code</span> v2.1.96</p>
          <p>Opus 4.6 (1M context) · Claude Max</p>
        </div>
      </div>
      <div className="claude-term-mini-divider" />
      <div className="claude-term-mini-line">
        <span className="claude-term-mini-prompt">{'>'}</span>
        <span className="claude-term-mini-cmd">{cmdText}</span>
        {phase === 'typing' && <span className="claude-term-mini-caret">▍</span>}
      </div>
      <div className="claude-term-mini-reply">
        {replyLines.map((l, i) => (
          <p key={i} className="claude-term-mini-reply-line">{l}</p>
        ))}
      </div>
    </div>
  )
}

function AppV3() {
  useReveal()
  return (
    <div className="min-h-screen">
      {/* TOP BAR */}
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-item"><span className="topbar-fire">🔥</span> LOTE 0 · <strong>R$ 9</strong></span>
          <span className="topbar-sep">|</span>
          <span className="topbar-item">74% das vagas preenchidas</span>
          <div className="topbar-progress"><div className="topbar-progress-fill" /></div>
        </div>
      </div>

      {/* HERO V3 - Stack Price (refatorado) */}
      <section className="hero-v3-section">
        <div className="hero-v3-container">
          <div className="hero-v3-left">
            <img src="/assets/LOGO.png" alt="Logo" className="h-14 md:h-16 mb-8 mx-auto md:mx-0" />
            <p className="hero-v3-eyebrow">Imersão online ao vivo · 25 de abril</p>
            <h1 className="hero-v3-title">
              Tudo isso por menos de <span className="highlight-orange">R$ 9</span> pra você comandar sua operação inteira por voz.
            </h1>
            <p className="hero-v3-sub">3 horas ao vivo onde você sai operando tráfego pago por comando de voz e texto. Sem n8n. Sem código. Sem dor. Veja o que está incluso ao lado.</p>
            <div className="hero-v3-meta">
              <div><span className="badge">Data</span><p>25/04 (sábado)</p></div>
              <div><span className="badge">Horário</span><p>9h às 12h</p></div>
            </div>
            <div className="hero-v3-mini-term"><ClaudeTerminalMini /></div>
          </div>
          <div className="hero-v3-right">
            <div className="hero-v3-card">
              <div className="hero-v3-card-header">LOTE 0 · OFERTA ESPECIAL</div>
              <ul className="hero-v3-list">
                <li><span className="hero-v3-check">✓</span> 3h de imersão Claude Code ao vivo<span className="hero-v3-old">R$ 297</span></li>
                <li><span className="hero-v3-check">✓</span> Comando da operação por voz e texto<span className="hero-v3-old">R$ 297</span></li>
                <li><span className="hero-v3-check">✓</span> Script de scraping de criativos do concorrente<span className="hero-v3-old">R$ 297</span></li>
                <li><span className="hero-v3-check">✓</span> Skill /diagnostico-conta (1 comando, 8s)<span className="hero-v3-old">R$ 197</span></li>
                <li><span className="hero-v3-check">✓</span> Sub-agentes Subidor + Relator + Vigia prontos<span className="hero-v3-old">R$ 197</span></li>
                <li><span className="hero-v3-check">✓</span> Cérebro Obsidian de memória infinita<span className="hero-v3-old">R$ 197</span></li>
                <li><span className="hero-v3-check">✓</span> Geração automática de análises estratégicas<span className="hero-v3-old">R$ 147</span></li>
                <li><span className="hero-v3-check">✓</span> Aula pré-evento "Claude Code em 30 min"<span className="hero-v3-old">R$ 97</span></li>
                <li><span className="hero-v3-check">✓</span> Cheatsheet 30 comandos essenciais<span className="hero-v3-old">R$ 47</span></li>
                <li><span className="hero-v3-check">✓</span> Comunidade WhatsApp dos inscritos<span className="hero-v3-old">R$ 47</span></li>
              </ul>
              <div className="hero-v3-divider" />
              <div className="hero-v3-total">
                <p>Valor total: <span className="line-through">R$ 1.820</span></p>
                <p className="hero-v3-now">Hoje no Lote 0:</p>
              </div>
              <p className="hero-v3-price">
                <span className="hero-v3-cur">R$</span><span className="hero-v3-num">9</span><sup>,00</sup>
              </p>
              <p className="hero-v3-installment">à vista no PIX ou cartão</p>
              <span className="cta-stack hero-v3-cta">
                <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist btn-brutalist-orange">GARANTIR MEU INGRESSO →</a>
                <CtaProgress />
              </span>
              <p className="hero-v3-secure">🔒 Compra segura · Lote 0 acaba quando esgotar</p>
            </div>
          </div>
        </div>
      </section>

      {/* COUNTDOWN */}
      <section className="py-12 md:py-16 px-5 text-center" style={{ backgroundColor: '#09090B' }}>
        <p className="uppercase tracking-widest text-sm text-txts mb-6">A imersão começa em</p>
        <Countdown big />
      </section>

      {/* CÉREBRO OBSIDIAN */}
      <section className="py-20 md:py-28 border-y border-bgt" style={{ backgroundColor: '#050505' }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="reveal text-center lg:text-left">
              <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Memória infinita</p>
              <h2 className="section-title mb-6">O Jarvis <span className="highlight-orange">nunca esquece</span> nada da sua operação.</h2>
              <p className="text-lg text-txts mb-8">
                Cada campanha que você roda, cada criativo que funcionou, cada cliente, cada teste — vira memória viva. Você comanda. Ele lembra. Sempre.
              </p>
              <ul className="space-y-4 text-left max-w-md mx-auto lg:mx-0">
                <li className="flex gap-3">
                  <span className="text-accent font-black shrink-0">→</span>
                  <span><span className="text-white font-bold">Memória permanente.</span> <span className="text-txts">Nada do que funcionou se perde no tempo.</span></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-black shrink-0">→</span>
                  <span><span className="text-white font-bold">Contexto em todas as decisões.</span> <span className="text-txts">Os agentes consultam o histórico antes de agir.</span></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-black shrink-0">→</span>
                  <span><span className="text-white font-bold">Você vê seu negócio virar conhecimento.</span> <span className="text-txts">Em tempo real, na sua frente.</span></span>
                </li>
              </ul>
            </div>
            <div className="brain-wrap reveal">
              <ObsidianBrain />
            </div>
          </div>
        </div>
      </section>

      {/* IDENTIFICAÇÃO */}
      <section className="bg-bgs py-20 md:py-28 border-y border-bgt blob-bg">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Você se identifica?</p>
          <h2 className="reveal section-title text-center mb-4">O Claude para <span className="highlight-orange">Gestores de Tráfego</span><br/>é para você que:</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {identCards.map((c, i) => (
              <div key={i} className="reveal tech-card ident-card">
                <span className="badge mb-4">0{i + 1}</span>
                <h3 className="text-xl font-black mt-4 mb-3">{c.t}</h3>
                <p className="text-txts text-sm leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-12 text-lg text-txts">
            Se você se identifica com pelo menos um dos itens acima, <span className="text-white font-bold">essa imersão foi feita exatamente para você.</span>
          </p>
        </div>
      </section>

      {/* PROGRAMAÇÃO */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Programação Completa</p>
          <h2 className="reveal section-title text-center mb-14">O que você vai construir ao vivo</h2>

          <ol className="timeline">
            <li className="timeline-item reveal">
              <div className="timeline-marker">
                <span className="timeline-time">9h</span>
                <span className="timeline-dot" />
              </div>
              <div className="timeline-card">
                <span className="badge mb-3">BLOCO 01 — FUNDAÇÃO + SUBIDOR · 9h às 10h30</span>
                <p className="text-txts mt-2 mb-5 italic border-l-2 border-accent pl-4">
                  Você muda de ferramenta, paga novo SaaS, contrata mais gente… mas o operacional continua engolindo seu dia. Não é sobre fazer mais. É sobre comandar.
                </p>
                <ul className="space-y-3">
                  {dia1.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-accent font-black shrink-0">→</span>
                      <span className="text-sm leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li className="timeline-item reveal">
              <div className="timeline-marker">
                <span className="timeline-time">10h30</span>
                <span className="timeline-dot" />
              </div>
              <div className="timeline-card">
                <span className="badge mb-3">BLOCO 02 — RELATOR + VIGIA + SKILL MESTRE · 10h30 às 12h</span>
                <p className="text-txts mt-2 mb-5 italic border-l-2 border-accent pl-4">
                  Seu n8n não vai conseguir fazer isso. Workflow visual ficou pra trás. A próxima geração é agente que entende contexto, lembra da sua operação e age sozinho.
                </p>
                <ul className="space-y-3">
                  {dia2.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-accent font-black shrink-0">→</span>
                      <span className="text-sm leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li className="timeline-item timeline-item--end reveal">
              <div className="timeline-marker">
                <span className="timeline-time">12h</span>
                <span className="timeline-dot timeline-dot--end" />
              </div>
              <div className="timeline-end-text">
                <strong>Você sai com 3 agentes + 1 cérebro Obsidian rodando.</strong>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* BÔNUS */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h2 className="reveal section-title mb-14">Além disso, você também <span className="highlight-orange">ganha:</span></h2>
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <div className="reveal tech-card ident-card text-left">
              <span className="badge mb-4">Aula pré-evento</span>
              <h3 className="text-xl font-black mt-4 mb-3">Claude Code em 30 minutos para iniciantes</h3>
              <p className="text-txts text-sm">Pra você chegar quente no sábado mesmo se nunca usou Claude Code antes. Acesso imediato após a inscrição.</p>
            </div>
            <div className="reveal tech-card ident-card text-left">
              <span className="badge mb-4">Templates prontos</span>
              <h3 className="text-xl font-black mt-4 mb-3">Cheatsheet PDF + Template do Subidor</h3>
              <p className="text-txts text-sm">20 comandos essenciais do Claude Code para gestor de tráfego + template do primeiro agente entregue antes da imersão.</p>
            </div>
          </div>
          <span className="cta-stack">
            <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist">GARANTIR MINHA VAGA — R$9</a>
            <CtaProgress />
          </span>
          <p className="mt-4 text-sm text-txts">Pagamento Seguro | Acesso imediato aos bônus</p>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Depoimentos</p>
          <h2 className="reveal section-title text-center max-w-4xl mx-auto mb-14">
            Resultados de gestores que já operam com Claude Code. Olha o que <span className="highlight-orange">eles mesmos dizem</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {['Depoimento 1','Depoimento 2','Depoimento 3','Depoimento 4'].map((d,i)=>(
              <div key={i} className="reveal tech-card aspect-[3/4] flex items-center justify-center text-center">
                <span className="text-txts text-sm">{d}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="cta-stack">
              <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist">QUERO OPERAR ASSIM TAMBÉM</a>
              <CtaProgress />
            </span>
          </div>
        </div>
      </section>

      {/* DUAS TRANSFORMAÇÕES */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Uma manhã. Duas transformações.</p>
          <h2 className="reveal section-title mb-6">Liberdade operacional + nova oferta premium:<br/><span className="highlight-orange">a mesma stack, dois resultados.</span></h2>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-4">
            Você não opera só pra sobreviver. Quando seu Subidor, Relator e Vigia estão rodando, você não só ganha de volta seu sábado — você passa a ter uma oferta que ninguém da sua cidade tem.
          </p>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-14">
            Os mesmos 3 agentes que tiram você do operacional viram diferencial competitivo pra cobrar 2x mais dos seus clientes. Mesma construção, dois resultados.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Liberdade</span>
              <h3 className="text-xl font-black mt-4 mb-3">Operação que roda sem você</h3>
              <p className="text-txts text-sm">Pare de ser refém do Gerenciador. Recupere seus sábados, durma sem alarme de saldo zerado.</p>
            </div>
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Premium</span>
              <h3 className="text-xl font-black mt-4 mb-3">Oferta que ninguém tem</h3>
              <p className="text-txts text-sm">Venda "gestão de tráfego com agentes IA" e cobre R$2k–8k a mais por cliente. Diferenciação real.</p>
            </div>
          </div>
          <span className="cta-stack">
            <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist">QUERO AS DUAS COISAS</a>
            <CtaProgress />
          </span>
        </div>
      </section>

      {/* QUEM É */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4 text-white order-2 md:order-1">
              <p className="uppercase tracking-widest text-sm font-bold eyebrow">Quem é</p>
              <TypeHeading
                className="section-title mb-4"
                style={{ minHeight: 'calc(2.5rem * 1.1 * 2)' }}
                text={'Afinal, quem sou eu pra te ensinar isso?'}
                highlight={'te ensinar isso?'}
              />
              <p className="text-white text-xl font-black">Prazer, Isaac Santos!</p>
              <p>Antes de tudo, sou alguém que já foi refém do operacional — subindo campanha de madrugada, mandando relatório no domingo, com 8 contas pra olhar e nenhum tempo pra crescer.</p>
              <p>Foram <span className="text-white font-bold">+8 anos rodando tráfego pago</span> em diferentes nichos — e-commerce, infoproduto, SaaS, negócio local — gerenciando contas que somam <span className="text-white font-bold">milhões em mídia</span>.</p>
              <p>Quando o Claude Code apareceu, eu virei a chave: parei de tentar automatizar com workflow visual e comecei a comandar. Hoje minha operação roda enquanto eu durmo.</p>
              <p>E agora, na imersão Claude para Gestores de Tráfego, vou te mostrar exatamente como construir esse mesmo sistema — em 3 horas ao vivo, sem você precisar escrever uma linha de código.</p>
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div><p className="text-3xl font-black highlight-orange">+R$XM em mídia gerida</p><p className="text-xs text-txts uppercase tracking-wider">Mídia gerenciada</p></div>
                <div><p className="text-3xl font-black highlight-orange">+8 anos em tráfego</p><p className="text-xs text-txts uppercase tracking-wider">De experiência prática</p></div>
                <div><p className="text-3xl font-black highlight-orange">+50 contas</p><p className="text-xs text-txts uppercase tracking-wider">Operadas com agentes</p></div>
              </div>
            </div>
            <div className="reveal tech-card !p-0 overflow-hidden flex flex-col order-1 md:order-2">
              <img src="/assets/isaacbio.png" alt="Isaac Santos" className="w-full h-full object-cover" />
              <div className="p-6 text-center border-t border-bgt">
                <p className="text-xl font-black">Isaac Santos</p>
                <p className="text-txts text-sm">Especialista em Tráfego com Claude Code</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* E TEM MAIS */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">E tem mais</p>
          <h2 className="reveal section-title mb-6">Liberte sua operação… e dê o próximo passo<br /><span className="highlight-orange">com a comunidade</span></h2>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-14">
            Em 3 horas você sai com 3 agentes rodando. Mas se você quiser ir além — ter biblioteca de skills crescendo toda semana, lives de novos agentes, suporte direto e templates por nicho — durante a imersão nós vamos abrir uma oportunidade exclusiva: a Comunidade Claude Code para Tráfego.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Imersão</span>
              <p className="mt-4">Sai com 3 agentes + cérebro Obsidian rodando na sua máquina</p>
            </div>
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Comunidade</span>
              <p className="mt-4">Acesso exclusivo à Comunidade Claude Code para Tráfego com condições únicas pra quem estiver ao vivo</p>
            </div>
          </div>
          <span className="cta-stack">
            <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist">QUERO OS DOIS — GARANTIR MINHA VAGA</a>
            <CtaProgress />
          </span>
        </div>
      </section>

      {/* CHECKOUT / OFERTA */}
      <section id="checkout" className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <div className="offer-wrap">
            {/* LEFT */}
            <div className="offer-left">
              <h2 className="offer-title">Claude para Gestores de Tráfego<br/><span className="highlight-orange">Acesso completo + bônus</span></h2>
              <p className="offer-meta">Sábado 25 de abril · 9h às 12h · Online ao vivo · Bônus inclusos</p>

              <div className="offer-features">
                {[
                  { t: '3h ao vivo', d: 'Construção prática comigo', i: '⏱' },
                  { t: '3 Agentes prontos', d: 'Subidor + Relator + Vigia', i: '◎' },
                  { t: 'Cérebro Obsidian', d: 'Memória que nunca esquece', i: '✦' },
                  { t: 'Bônus inclusos', d: 'Aula prep + cheatsheet', i: '♡' },
                ].map((f, i) => (
                  <div key={i} className="offer-feature">
                    <div className="offer-feature-icon">{f.i}</div>
                    <div>
                      <p className="offer-feature-title">{f.t}</p>
                      <p className="offer-feature-desc">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="offer-footer">
                <div className="offer-pay">
                  <span className="offer-pay-label">Formas de pagamento:</span>
                  <div className="offer-pay-icons">
                    <span>💳</span><span>🏦</span><span>⚡</span>
                  </div>
                </div>
                <div className="offer-seals">
                  <div className="offer-seal"><span>🔒</span><span>Compra segura</span></div>
                  <div className="offer-seal"><span>✓</span><span>7 dias garantia</span></div>
                  <div className="offer-seal"><span>⚡</span><span>Acesso imediato</span></div>
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="offer-divider" />

            {/* RIGHT */}
            <div className="offer-right">
              <div className="offer-brand flex justify-center">
                <img src="/assets/LOGO.png" alt="Claude para Gestores de Tráfego" className="h-12 md:h-14" />
              </div>

              <div className="offer-price">
                <div className="offer-price-old">
                  <span className="line-through">R$ 197,00</span>
                  <span className="offer-price-por">POR:</span>
                </div>
                <p className="offer-price-main">
                  <span className="offer-price-cur">R$</span>
                  <span className="offer-price-num">9</span>
                  <sup className="offer-price-cents">,00</sup>
                </p>
                <p className="offer-price-sub">ou no PIX à vista</p>
              </div>

              <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="offer-cta">GARANTIR MEU INGRESSO</a>

              <div className="offer-progress">
                <div className="offer-progress-bar"><div className="offer-progress-fill" /></div>
                <div className="offer-progress-label">
                  <strong>LOTE 0</strong>
                  <span>74% dos ingressos vendidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Simples assim</p>
          <h2 className="reveal section-title mb-14">Como funciona?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['01','Inscreva-se','Clique no botão, garanta sua vaga pelo checkout com cartão ou PIX.'],
              ['02','Receba o acesso','Você recebe imediatamente a aula preparatória, o cheatsheet e o link da imersão.'],
              ['03','Construa ao vivo','Sábado 9h, abre o Claude Code comigo e sai com 3 agentes rodando na sua máquina.'],
            ].map(([n,t,d])=>(
              <div key={n} className="reveal tech-card ident-card text-left">
                <p className="text-5xl font-black highlight-orange mb-4">{n}</p>
                <h3 className="text-xl font-black mb-2">{t}</h3>
                <p className="text-txts text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS 2 */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Depoimentos</p>
          <h2 className="reveal section-title text-center max-w-4xl mx-auto mb-14">
            Resultados de gestores que já operam com Claude Code. Olha o que <span className="highlight-orange">eles mesmos dizem</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {['Depoimento 1','Depoimento 2','Depoimento 3','Depoimento 4'].map((d,i)=>(
              <div key={i} className="reveal tech-card aspect-[3/4] flex items-center justify-center">
                <span className="text-txts text-sm">{d}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="cta-stack">
              <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist">QUERO OPERAR ASSIM TAMBÉM</a>
              <CtaProgress />
            </span>
          </div>
        </div>
      </section>

      {/* EXCLUSIVO PARTICIPANTES */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Exclusivo para participantes</p>
          <h2 className="reveal section-title mb-6">Uma oportunidade que só existe<br /><span className="highlight-orange">dentro da imersão</span></h2>
          <p className="text-lg text-txts mb-10">
            Durante a imersão de sábado, vamos abrir as portas para quem quiser dar o próximo passo: a Comunidade Claude Code para Tráfego.
          </p>
          <div className="reveal tech-card ident-card text-left mb-10">
            <span className="badge mb-4">Comunidade Claude Code para Tráfego</span>
            <p className="text-txts mt-4 mb-6">
              Biblioteca de skills crescendo toda semana, lives de novos agentes, templates por nicho, suporte direto comigo e acesso ao Jarvis Mode completo. As inscrições serão abertas exclusivamente durante a imersão, apenas para quem estiver presente — com condições únicas que não estarão disponíveis em nenhum outro momento.
            </p>
            <ul className="space-y-2">
              {['Skills novas toda semana','Suporte direto e templates por nicho','Condições únicas só na imersão'].map((t,i)=>(
                <li key={i} className="flex gap-3"><span className="text-accent font-black">→</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-txts mb-8">Seu ingresso da imersão é a porta de entrada para essa oportunidade.</p>
          <span className="cta-stack">
            <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist">GARANTIR MEU INGRESSO — R$9</a>
            <CtaProgress />
          </span>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Dúvidas frequentes</p>
          <h2 className="reveal section-title text-center mb-14">Perguntas e <span className="highlight-orange">Respostas</span></h2>
          <div className="space-y-4">
            {faq.map(([q,a],i)=>(
              <details key={i} className="faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-txts mb-4">Ainda tem dúvidas?</p>
            <a href="#" className="btn-brutalist">FALAR COM NOSSO TIME</a>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 bg-bgs border-t border-bgt">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="reveal section-title mb-6">Sua operação está<br /><span className="highlight-orange">a um comando de distância</span></h2>
          <p className="text-lg text-txts mb-10">
            Não passe mais um sábado subindo campanha manualmente. O 1° lote é a sua chance de entrar pelo menor preço da história dessa imersão.
          </p>
          <div className="mb-10"><Countdown compact /></div>
          <span className="cta-stack">
            <a href="https://checkout.ticto.app/OF2C85B97" target="_blank" rel="noopener noreferrer" className="btn-brutalist btn-brutalist-orange">GARANTIR MEU INGRESSO POR R$9</a>
            <CtaProgress />
          </span>
          <p className="text-sm text-txts mt-6">Vagas limitadas · 1° lote · Compra segura</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 bg-bgp border-t border-bgt text-center">
        <img src="/assets/LOGO.png" alt="Logo" className="h-8 mx-auto mb-4 opacity-80" />
        <p className="text-txts text-sm">© 2026 Isaac Santos. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

export default AppV3
