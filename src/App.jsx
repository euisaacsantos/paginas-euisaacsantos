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
  const full = 'Dois dias para curar a RAIZ dos seus problemas com relacionamentos e dinheiro.'
  const typed = useTypewriter(full, 22)
  const raizStart = full.indexOf('RAIZ')
  const raizEnd = raizStart + 4
  const before = typed.slice(0, Math.min(typed.length, raizStart))
  const raiz = typed.slice(Math.min(typed.length, raizStart), Math.min(typed.length, raizEnd))
  const after = typed.slice(Math.min(typed.length, raizEnd))
  const done = typed.length >= full.length
  return (
    <h1 className="mb-6 font-black leading-[1.05] tracking-tight" style={{ fontSize: '48px', minHeight: 'calc(48px * 1.05 * 4)' }}>
      {before}
      <span className="highlight-orange">{raiz}</span>
      {after}
      <span className={`typewriter-caret ${done ? 'blink' : ''}`}>|</span>
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
  const target = new Date('2026-04-11T09:00:00-03:00').getTime()
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
  { t: 'Piloto automático', d: 'Se sente travada em diferentes áreas da vida: no corpo, no trabalho, no amor. Faz tudo no automático e não sabe como sair.' },
  { t: 'Dramas nos relacionamentos', d: 'Cansou de repetir os mesmos conflitos: com o parceiro, com a mãe, com a sogra ou com as amigas. Muda as pessoas, mas o padrão continua.' },
  { t: 'Dinheiro que escapa', d: 'Não entende por que o dinheiro sempre foge das suas mãos: você até ganha, mas não consegue manter nem crescer.' },
  { t: 'Sobrecarga e ansiedade', d: 'Vive tensa, ansiosa e se sente sobrecarregada por tentar dar conta de tudo. Acordar já cansada virou rotina.' },
  { t: 'Comparação e culpa', d: 'Se culpa por procrastinar e se compara com mulheres que já alcançaram o que você deseja. Sente que está ficando para trás.' },
  { t: 'Já tentou de tudo', d: 'Leu livros, fez terapia, assistiu vídeos… mas nada realmente chegou na raiz. Os padrões continuam se repetindo.' },
]

const dia1 = [
  'Diagnóstico emocional: 7 perguntas para você enxergar com honestidade o padrão que governa suas relações.',
  'Os 3 mecanismos psicológicos (embasados em Harvard) que explicam por que você perde poder dentro dos seus relacionamentos, e como reverter.',
  'De onde vem sua autoestima, como ela foi construída e por que ela está "ancorada" nas pessoas erradas.',
  'Mapeamento das suas âncoras emocionais e padrões de validação.',
  'As 3 premissas que distorcem seus relacionamentos e como substituí-las por uma postura estratégica.',
]
const dia2 = [
  'Por que a mesma lente que distorce seus relacionamentos distorce sua relação com dinheiro (e como sua sogra pode estar atrapalhando sua prosperidade).',
  'A Equação da Prosperidade: causas sutis + causas físicas: o que realmente produz resultado na sua vida.',
  'Por que você está travada: o Pacto da Mediocridade, a Síndrome do "Pelo Menos" e o barco com um remo só.',
  'Os Passos da Prosperidade: do desejo à transformação, com um mapa claro do que você precisa ativar.',
  'Modo Sobrevivência vs. Modo Autoestima: o caminho para deixar de decidir por medo e começar a decidir por valor.',
]

const faq = [
  ['Como funciona o Workshop?', 'O Workshop Cura na Raiz acontece ao vivo nos dias 11 e 12 de abril, das 9h às 12h, via plataforma online. Você recebe o link no e-mail após a inscrição.'],
  ['Preciso ter conhecimento prévio?', 'Não. O workshop foi desenhado para qualquer mulher que deseja transformar seus relacionamentos e sua prosperidade, do zero.'],
  ['E se eu não puder assistir no dia?', 'As aulas ficarão disponíveis por tempo limitado para quem estiver inscrita, para rever com calma.'],
  ['Por que R$ 47?', 'Porque o 1° lote é uma condição especial de lançamento. O preço sobe para R$ 67 e depois R$ 97 conforme os lotes esgotarem.'],
  ['Quais as formas de pagamento?', 'Cartão de crédito (parcelado em até 6x), PIX ou boleto pela Hotmart.'],
  ['Tem garantia?', 'Sim! Você tem 7 dias de garantia incondicional. Se não gostar, devolvemos 100% do seu investimento.'],
]

function App() {
  useReveal()
  return (
    <div className="min-h-screen">
      {/* TOP BAR */}
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-item"><span className="topbar-fire">🔥</span> 1° LOTE · <strong>R$ 47</strong></span>
          <span className="topbar-sep">|</span>
          <span className="topbar-item">96% das vagas preenchidas</span>
          <div className="topbar-progress"><div className="topbar-progress-fill" /></div>
        </div>
      </div>

      {/* HERO */}
      <section className="hero-section relative overflow-hidden">
<div className="hero-container px-5 pt-16 pb-6 md:pt-24 md:pb-8 text-center md:text-left relative z-10">
          <img src="/assets/LOGO.svg" alt="Logo" className="h-10 md:h-12 mb-6 mx-auto md:mx-0" />
          <HeroTitle />
          <p className="text-lg md:text-xl text-txts max-w-3xl md:mx-0 mx-auto mb-10">
            Aplique o método validado por <span className="text-white font-bold">+40 mil mulheres</span> e embasado na neurociência para viver relações mais leves e ativar sua prosperidade.
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-10 justify-center md:justify-start">
            <div className="flex items-center gap-3">
              <span className="badge">Data</span>
              <p className="text-base font-black">11 e 12 de abril</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge">Horário</span>
              <p className="text-base font-black">9h às 12h</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg md:mx-0 mx-auto">
            <div className="lote-card lote-card--active">
              <span className="lote-fire">🔥</span>
              <span className="lote-label">1° Lote</span>
              <span className="lote-price">R$ 47</span>
            </div>
            <div className="lote-card">
              <span className="lote-label">2° Lote</span>
              <span className="lote-price">R$ 67</span>
            </div>
            <div className="lote-card">
              <span className="lote-label">3° Lote</span>
              <span className="lote-price">R$ 97</span>
            </div>
          </div>

          <a href="#checkout" className="btn-brutalist mb-12">GARANTIR MEU INGRESSO POR R$47</a>

        </div>
      </section>

      {/* COUNTDOWN */}
      <section className="py-12 md:py-16 px-5 text-center" style={{ backgroundColor: '#09090B' }}>
        <p className="uppercase tracking-widest text-sm text-txts mb-6">O workshop começa em</p>
        <Countdown big />
      </section>

      {/* IDENTIFICAÇÃO */}
      <section className="bg-bgs py-20 md:py-28 border-y border-bgt blob-bg">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Você se identifica?</p>
          <h2 className="reveal section-title text-center mb-4">O Workshop <span className="highlight-orange">Cura na Raiz</span><br />é para você que:</h2>
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
            Se você se identifica com ao menos um dos itens acima, <span className="text-white font-bold">esse Workshop foi criado para você.</span>
          </p>
        </div>
      </section>

      {/* PROGRAMAÇÃO */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Programação Completa</p>
          <h2 className="reveal section-title text-center mb-14">O que vai acontecer em cada dia</h2>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="reveal tech-card dia-card !p-8 md:!p-10">
              <span className="badge mb-4">DIA 01 — RELACIONAMENTOS | 11/04</span>
              <p className="text-txts mt-4 mb-6 italic border-l-2 border-accent pl-4">
                Você muda tudo por fora… mas o padrão continua. Não é o outro. É como você se posiciona.
              </p>
              <ul className="space-y-4">
                {dia1.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-accent font-black shrink-0">→</span>
                    <span className="text-sm leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal tech-card dia-card !p-8 md:!p-10">
              <span className="badge mb-4">DIA 02 — PROSPERIDADE | 12/04</span>
              <p className="text-txts mt-4 mb-6 italic border-l-2 border-accent pl-4">
                Você não tem várias versões suas. Você é uma só. E é por isso que o que te desorganiza no relacionamento… também trava a sua prosperidade.
              </p>
              <ul className="space-y-4">
                {dia2.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-accent font-black shrink-0">→</span>
                    <span className="text-sm leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* BÔNUS */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h2 className="reveal section-title mb-14">Além disso, você também <span className="highlight-orange">ganha:</span></h2>
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <div className="reveal tech-card ident-card text-left">
              <span className="badge mb-4">Aplicativo Namah</span>
              <h3 className="text-xl font-black mt-4 mb-3">1 semana de acesso ao Aplicativo Namah</h3>
              <p className="text-txts text-sm">O maior App de bem-estar do Brasil, com oráculo do dia, yoga, meditações e práticas para incluir na sua rotina.</p>
            </div>
            <div className="reveal tech-card ident-card text-left">
              <span className="badge mb-4">Liz - Terapeuta Virtual</span>
              <h3 className="text-xl font-black mt-4 mb-3">1 semana de acesso à Liz, a terapeuta virtual</h3>
              <p className="text-txts text-sm">Ela estará disponível 24h por dia para conversar com você e te ajudar a encontrar a RAIZ das suas questões.</p>
            </div>
          </div>
          <a href="#checkout" className="btn-brutalist">GARANTIR MEU INGRESSO PARA OS DOIS DIAS — R$47</a>
          <p className="mt-4 text-sm text-txts">Pagamento Seguro | Acesso imediato aos bônus</p>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Depoimentos</p>
          <h2 className="reveal section-title text-center max-w-4xl mx-auto mb-14">
            Eu poderia até falar que um final de semana vai valer por anos de terapia. Mas vou deixar <span className="highlight-orange">elas falarem por mim</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {['Depoimento 1','Depoimento 3','Depoimento 4','Depoimento 5'].map((d,i)=>(
              <div key={i} className="reveal tech-card aspect-[3/4] flex items-center justify-center text-center">
                <span className="text-txts text-sm">{d}</span>
              </div>
            ))}
          </div>
          <div className="text-center"><a href="#checkout" className="btn-brutalist">QUERO VIVER ESSA TRANSFORMAÇÃO</a></div>
        </div>
      </section>

      {/* DUAS TRANSFORMAÇÕES */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Um final de semana para viver duas transformações</p>
          <h2 className="reveal section-title mb-6">Relacionamentos + Prosperidade:<br /><span className="highlight-orange">a mesma raiz, a mesma cura.</span></h2>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-4">
            Você não é uma pizza. Não tem uma "fatia" para o amor e outra para o dinheiro. Você é uma mulher só, uma identidade só, uma lente só.
          </p>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-14">
            A ferida que te faz aceitar menos nos relacionamentos é a mesma que te impede de prosperar. Por isso o Workshop Cura na Raiz trabalha as duas áreas juntas, porque quando a raiz muda, a vida inteira muda.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Relacionamentos</span>
              <h3 className="text-xl font-black mt-4 mb-3">Relacionamentos mais leves</h3>
              <p className="text-txts text-sm">Quebre os padrões que governam suas relações e viva em paz: consigo mesma, com os outros e com a vida.</p>
            </div>
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Prosperidade</span>
              <h3 className="text-xl font-black mt-4 mb-3">Prosperidade ativada</h3>
              <p className="text-txts text-sm">Identifique o que realmente te trava e entre em movimento de expansão no dinheiro, na carreira e na saúde.</p>
            </div>
          </div>
          <a href="#checkout" className="btn-brutalist">QUERO AS DUAS TRANSFORMAÇÕES</a>
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
                text={'Afinal, quem sou eu pra te prometer "Cura na Raiz"?'}
                highlight={'"Cura na Raiz"?'}
              />
              <p className="text-white text-xl font-black">Prazer, Carol Rache!</p>
              <p>Em primeiro lugar, sou alguém que, um dia, também já buscou cura: nos relacionamentos, no dinheiro, no corpo e na autoestima.</p>
              <p>Foram <span className="text-white font-bold">+11 anos estudando comportamento humano</span> com nomes como: Tony Robbins, Harvard e outras grandes instituições.</p>
              <p>Tudo isso para, hoje, conseguir poupar o seu tempo e te entregar, em um final de semana, a transformação que você deseja há tantos anos.</p>
              <p>E agora, no Workshop Cura na Raiz, vou te entregar um método autoral, embasado na neurociência, para curar seus problemas na raiz e quebrar os padrões que travam os seus resultados em todas as áreas da vida.</p>
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div><p className="text-3xl font-black highlight-orange">+40 mil</p><p className="text-xs text-txts uppercase tracking-wider">Mulheres transformadas</p></div>
                <div><p className="text-3xl font-black highlight-orange">+11 anos</p><p className="text-xs text-txts uppercase tracking-wider">De estudo e prática</p></div>
                <div><p className="text-3xl font-black highlight-orange">+1.3 mi</p><p className="text-xs text-txts uppercase tracking-wider">Seguidoras</p></div>
              </div>
            </div>
            <div className="reveal tech-card !p-0 overflow-hidden flex flex-col order-1 md:order-2">
              <img src="/assets/isaacbio.png" alt="Carol Rache" className="w-full h-full object-cover" />
              <div className="p-6 text-center border-t border-bgt">
                <p className="text-xl font-black">Carol Rache</p>
                <p className="text-txts text-sm">Especialista em Comportamento Humano</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* E TEM MAIS */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">E tem mais</p>
          <h2 className="reveal section-title mb-6">Cure suas dores… e dê o próximo passo<br /><span className="highlight-orange">na sua transformação</span></h2>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-14">
            Em 2 dias você vai ressignificar suas dores mais profundas. Mas se você quiser ir além — construir uma vida inteira diferente — durante o workshop nós vamos abrir uma oportunidade exclusiva de continuar essa jornada na Mentoria Acenda Sua Luz.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Cura Pessoal</span>
              <p className="mt-4">Liberte seus traumas e reconecte-se com quem você realmente é</p>
            </div>
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Próximo Nível</span>
              <p className="mt-4">Acesso exclusivo à Mentoria Acenda Sua Luz com condições únicas para participantes</p>
            </div>
          </div>
          <a href="#checkout" className="btn-brutalist">QUERO OS DOIS — GARANTIR MINHA VAGA</a>
        </div>
      </section>

      {/* CHECKOUT / OFERTA */}
      <section id="checkout" className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-5">
          <div className="offer-wrap">
            {/* LEFT */}
            <div className="offer-left">
              <h2 className="offer-title">Workshop Cura na Raiz<br/><span className="highlight-orange">Acesso completo aos 2 dias</span></h2>
              <p className="offer-meta">11 e 12 de abril · 9h às 12h · Online ao vivo · Bônus inclusos</p>

              <div className="offer-features">
                {[
                  { t: '+5h de conteúdo', d: 'Com Carol Rache ao vivo', i: '⏱' },
                  { t: 'App Namah', d: '1 semana de acesso grátis', i: '◎' },
                  { t: 'Liz Terapeuta Virtual', d: '1 semana de acesso 24h', i: '✦' },
                  { t: 'Método validado', d: '+40 mil mulheres', i: '♡' },
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
                <img src="/assets/LOGO.svg" alt="Cura na Raiz" className="h-12 md:h-14" />
              </div>

              <div className="offer-price">
                <div className="offer-price-old">
                  <span className="line-through">R$ 497,00</span>
                  <span className="offer-price-por">POR:</span>
                </div>
                <p className="offer-price-main">
                  <span className="offer-price-cur">R$</span>
                  <span className="offer-price-num">47</span>
                  <sup className="offer-price-cents">,00</sup>
                </p>
                <p className="offer-price-sub">ou 6x de R$ 7,83</p>
              </div>

              <a href="#" className="offer-cta">GARANTIR MEU INGRESSO</a>

              <div className="offer-progress">
                <div className="offer-progress-bar"><div className="offer-progress-fill" /></div>
                <div className="offer-progress-label">
                  <strong>1° LOTE</strong>
                  <span>48% dos ingressos vendidos</span>
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
              ['01','Inscreva-se','Clique no botão, faça sua inscrição pela Hotmart com cartão ou PIX.'],
              ['02','Receba o acesso','Você receberá no e-mail o acesso aos bônus imediatamente + o link do workshop.'],
              ['03','Transforme-se','Participe nos dias 11 e 12 de abril e viva a sua transformação.'],
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
            Eu poderia até falar que um final de semana vai valer por anos de terapia. Mas vou deixar <span className="highlight-orange">elas falarem isso por mim</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {['Depoimento 1','Depoimento 3','Depoimento 4','Depoimento 5'].map((d,i)=>(
              <div key={i} className="reveal tech-card aspect-[3/4] flex items-center justify-center">
                <span className="text-txts text-sm">{d}</span>
              </div>
            ))}
          </div>
          <div className="text-center"><a href="#checkout" className="btn-brutalist">QUERO VIVER ESSA TRANSFORMAÇÃO</a></div>
        </div>
      </section>

      {/* MENTORIA */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Exclusivo para participantes</p>
          <h2 className="reveal section-title mb-6">Uma oportunidade que só existe<br /><span className="highlight-orange">dentro do Workshop</span></h2>
          <p className="text-lg text-txts mb-10">
            Durante os dias 11 e 12 de abril, vamos abrir as portas para quem quiser dar o próximo passo: a Mentoria Acenda Sua Luz.
          </p>
          <div className="reveal tech-card ident-card text-left mb-10">
            <span className="badge mb-4">Mentoria Acenda Sua Luz</span>
            <p className="text-txts mt-4 mb-6">
              Uma jornada completa de transformação com acompanhamento direto da Carol Rache. As inscrições serão abertas exclusivamente durante o workshop, apenas para quem estiver presente — com condições especiais que não estarão disponíveis em nenhum outro momento.
            </p>
            <ul className="space-y-2">
              {['Acompanhamento contínuo','Comunidade exclusiva','Condições únicas no evento'].map((t,i)=>(
                <li key={i} className="flex gap-3"><span className="text-accent font-black">→</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-txts mb-8">O ingresso do workshop é a sua porta de entrada para essa oportunidade.</p>
          <a href="#checkout" className="btn-brutalist">GARANTIR MEU INGRESSO — R$47</a>
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
          <h2 className="reveal section-title mb-6">Sua transformação está<br /><span className="highlight-orange">a um clique de distância</span></h2>
          <p className="text-lg text-txts mb-10">
            Não deixe a vida passar enquanto você continua presa nos mesmos padrões. O 1° lote é a sua chance de viver 2 dias que valem por anos de terapia.
          </p>
          <div className="mb-10"><Countdown compact /></div>
          <a href="#checkout" className="btn-brutalist btn-brutalist-orange">GARANTIR MEU INGRESSO POR R$47</a>
          <p className="text-sm text-txts mt-6">Vagas limitadas · 1° lote · Compra segura pela Hotmart</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 bg-bgp border-t border-bgt text-center">
        <img src="/assets/LOGO.svg" alt="Logo" className="h-8 mx-auto mb-4 opacity-80" />
        <p className="text-txts text-sm">© 2026 Carol Rache. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

export default App
