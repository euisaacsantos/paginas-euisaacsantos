import { useEffect, useState, useRef } from 'react'
import { useConfig } from './hooks/useConfig.js'
import { useLiveVendas } from './hooks/useLiveVendas.js'
import LiveToast from './components/LiveToast.jsx'

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

function VagasBar({ mesa }) {
  const pct = mesa.pct_vendido
  return (
    <div className="cta-progress cta-delayed">
      <div className="cta-progress-bar"><div className="cta-progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="cta-progress-label">
        <strong>MESA DE COMANDO</strong>
        <span>{mesa.restantes} das {mesa.total} vagas restantes</span>
      </div>
    </div>
  )
}

function VslPlayer() {
  const containerRef = useRef(null)
  useEffect(() => {
    if (!containerRef.current) return
    if (!document.querySelector('script[src*="69e301d8dbbc49f6be99f8a3"]')) {
      const s = document.createElement('script')
      s.src = 'https://scripts.converteai.net/0637c44b-8b3d-4750-9912-c3cd42d8c5c3/players/69e301d8dbbc49f6be99f8a3/v4/player.js'
      s.async = true
      document.head.appendChild(s)
    }
    if (!containerRef.current.querySelector('vturb-smartplayer')) {
      const el = document.createElement('vturb-smartplayer')
      el.id = 'vid-69e301d8dbbc49f6be99f8a3'
      el.style.display = 'block'
      el.style.width = '100%'
      containerRef.current.appendChild(el)
    }
  }, [])
  return <div className="vsl-vertical-wrap" ref={containerRef} />
}

const mesaBlocks = [
  {
    t: 'Compartilhamento de tela 1-a-1',
    d: 'Você abre seu Claude Code, seu Obsidian, sua conta de Ads. Eu vejo e destravo ao vivo.',
  },
  {
    t: 'Seu caso real, não demonstração',
    d: 'Chega com o ponto exato onde travou: contexto do Obsidian não carrega, agente não obedece, MCP não conecta. Resolvemos na hora.',
  },
  {
    t: 'Turma com 15, nunca 16',
    d: 'Limite duro. Três horas, quinze pessoas. Todo mundo tem tempo de tela com o Isaac na sessão.',
  },
  {
    t: 'Aprende também com os outros',
    d: 'Quando alguém destrava o agente dele, você absorve junto. São 15 casos reais em 6 horas — não um.',
  },
]

const mesaPraQuem = [
  { v: true, t: 'Você já sabe que vai travar sozinho quando sair da imersão' },
  { v: true, t: 'Você valoriza 2 semanas do seu tempo mais do que R$397' },
  { v: true, t: 'Você quer sair da semana com o Jarvis rodando, não só entendido' },
  { v: false, t: 'Você curte descobrir tudo sozinho no tentativa-e-erro' },
  { v: false, t: 'Você ainda não sabe se vai implementar de verdade' },
]

const mesaFaq = [
  ['Quando acontece a Mesa de Comando?', 'Segunda-feira, 05 de maio, das 19h às 22h — 72 horas depois da imersão. Link do Zoom chega no seu WhatsApp após a compra.'],
  ['Preciso ter feito a imersão antes?', 'Sim. A Mesa foi desenhada como continuação: você chega com o conteúdo fresco na cabeça e usa o tempo pra destravar implementação, não pra aprender do zero.'],
  ['E se eu não puder no dia?', 'A Mesa é 100% ao vivo e não é gravada pra redistribuição — o valor está em ter seu caso real destravado com você presente. Só compre se estiver confirmado pro horário.'],
  ['15 vagas valem pra lote 0 ou todos os lotes?', 'Todos os lotes dividem as mesmas 15 vagas. Lote 0 tem prioridade por ser o primeiro a ver a oferta — quando zerar, zera pra todos.'],
  ['Posso cancelar e pegar o dinheiro de volta?', 'Sim, até 7 dias antes da sessão. Nos 7 dias finais não tem reembolso porque a vaga fica bloqueada e impede outro de entrar.'],
]

const CTA_DELAY_MS = 30_000

function useCtaReveal(delayMs) {
  useEffect(() => {
    const t = setTimeout(() => {
      document.body.classList.add('ctas-visible')
    }, delayMs)
    return () => {
      clearTimeout(t)
      document.body.classList.remove('ctas-visible')
    }
  }, [delayMs])
}

function AppObrigado() {
  useReveal()
  useCtaReveal(CTA_DELAY_MS)
  const { config, setVendasLive, vendasIniciais } = useConfig()
  const mesa = config.mesa
  const [liveEvent, setLiveEvent] = useState(null)
  useLiveVendas({ onIncrement: setLiveEvent, onUpdate: setVendasLive, initial: vendasIniciais })

  return (
    <div className="min-h-screen">
      {/* PROGRESS BAR — inscrição 50% concluída (gatilho Zeigarnik) */}
      <div className="progress-topbar">
        <div className="progress-topbar-inner">
          <div className="progress-topbar-label">
            <span className="progress-topbar-step">ETAPA 1 DE 2</span>
            <span className="progress-topbar-pct">INSCRIÇÃO 50% CONCLUÍDA</span>
          </div>
          <div className="progress-topbar-bar">
            <div className="progress-topbar-fill" style={{ width: '50%' }} />
          </div>
        </div>
      </div>

      {/* HERO VSL — vídeo first-fold */}
      <section className="vsl-hero relative overflow-hidden">
        <div className="vsl-hero-container">
          <img src="/assets/LOGO.webp" alt="Logo" className="vsl-hero-logo" />
          <p className="vsl-hero-eyebrow">Atenção — falta 1 passo pra sua vaga valer</p>
          <h1 className="vsl-hero-title">
            Assista esse vídeo <span className="highlight-orange">antes de sair</span>.
          </h1>
          <p className="vsl-hero-sub vsl-hero-sub--oneline">
            Tem uma coisa que eu só explico aqui — e some quando você fechar essa página.
          </p>

          <VslPlayer />

          <div className="mesa-choice cta-delayed">
            <VagasBar mesa={mesa} />
            <button
              type="button"
              data-fallback-offer={mesa.offer_code}
              className="ticto-upsell-button btn-mesa-sim"
              onClick={() => { if (window === window.top) setTimeout(() => { window.location.href = mesa.checkout }, 400) }}
            >
              SIM, QUERO A MESA DE COMANDO
            </button>
            <a href="/confirmado" className="ticto-refuse-button btn-mesa-nao">
              Não, prefiro implementar sozinho sem ajuda
            </a>
          </div>
        </div>
      </section>

      {/* Seções abaixo do hero — reveladas junto com os CTAs após 30s */}
      <div className="sections-delayed">

      {/* O QUE ROLA NA MESA */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt blob-bg">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">O que rola na Mesa</p>
          <h2 className="reveal section-title text-center mb-4">
            Implementação cirúrgica, <span className="highlight-orange">não mais aula</span>.
          </h2>
          <p className="text-center text-lg text-txts max-w-3xl mx-auto mb-14">
            Na imersão você aprende. Na Mesa você implementa. Na tua máquina, com os teus clientes, no teu contexto.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {mesaBlocks.map((b, i) => (
              <div key={i} className="reveal tech-card ident-card">
                <span className="badge mb-4">0{i + 1}</span>
                <h3 className="text-xl font-black mt-4 mb-3">{b.t}</h3>
                <p className="text-txts text-sm leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRA QUEM É / PRA QUEM NÃO É */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-4xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Seja honesto consigo</p>
          <h2 className="reveal section-title text-center mb-14">
            A Mesa é pra você se<span className="highlight-orange">…</span>
          </h2>
          <ul className="space-y-4 max-w-2xl mx-auto w-fit">
            {mesaPraQuem.map((item, i) => (
              <li key={i} className="flex gap-4 items-start justify-start">
                <span className={`text-2xl font-black shrink-0 ${item.v ? 'text-accent' : 'text-txts'}`}>
                  {item.v ? '✓' : '✗'}
                </span>
                <span className={`text-lg ${item.v ? 'text-white' : 'text-txts line-through'}`}>
                  {item.t}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CHECKOUT MESA */}
      <section id="checkout-mesa" className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-6xl mx-auto px-5">
          <div className="offer-wrap">
            {/* LEFT */}
            <div className="offer-left">
              <h2 className="offer-title">Mesa de Comando<br/><span className="highlight-orange">72h depois da imersão</span></h2>
              <p className="offer-meta">Segunda 05/05 · 19h às 22h · Zoom ao vivo · 15 vagas</p>

              <div className="offer-features">
                {[
                  { t: '6h ao vivo', d: 'Sessão cirúrgica de implementação', i: '⏱' },
                  { t: 'Seu setup destravado', d: 'Compartilhamento de tela 1-a-1', i: '◎' },
                  { t: 'Turma de 15, não mais', d: 'Escassez real, não teatro', i: '✦' },
                  { t: 'Caso real', d: 'Você chega com teu problema, sai com a solução', i: '♡' },
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
                  <div className="offer-seal"><span>✓</span><span>Cancela até 7d antes</span></div>
                  <div className="offer-seal"><span>⚡</span><span>Zoom confirmado no WhatsApp</span></div>
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="offer-divider" />

            {/* RIGHT */}
            <div className="offer-right">
              <div className="offer-brand flex justify-center">
                <img src="/assets/mesa%20de%20comando%20logo.svg" alt="Mesa de Comando" className="h-20 md:h-24" />
              </div>

              <div className="offer-price">
                <div className="offer-price-old">
                  <span className="line-through">R$ 1.497,00</span>
                  <span className="offer-price-por">POR:</span>
                </div>
                <p className="offer-price-main">
                  <span className="offer-price-cur">R$</span>
                  <span className="offer-price-num">{mesa.preco}</span>
                  <sup className="offer-price-cents">,00</sup>
                </p>
                <p className="offer-price-sub">ou 12x de R$ 49,70</p>
              </div>

              <button type="button" data-fallback-offer={mesa.offer_code} className="ticto-upsell-button offer-cta cta-delayed" onClick={() => { if (window === window.top) setTimeout(() => { window.location.href = mesa.checkout }, 400) }}>QUERO MINHA VAGA NA MESA</button>

              <div className="offer-progress cta-delayed">
                <div className="offer-progress-bar"><div className="offer-progress-fill" style={{ width: `${mesa.pct_vendido}%` }} /></div>
                <div className="offer-progress-label">
                  <strong>VAGAS</strong>
                  <span>{mesa.restantes} de {mesa.total} restantes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAÇÃO: MESA ≠ COMUNIDADE (sem citar comunidade) */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Pra deixar claro</p>
          <h2 className="reveal section-title mb-6">Isso não é mentoria mensal.<br/><span className="highlight-orange">É uma sessão cirúrgica, uma vez.</span></h2>
          <p className="text-lg text-txts max-w-3xl mx-auto mb-10">
            A Mesa existe pra resolver um problema específico: tirar você do risco de sair da imersão, voltar pro operacional na segunda, e em 2 semanas nunca ter implementado. É o degrau entre <span className="text-white font-bold">aprender</span> e <span className="text-white font-bold">ter rodando</span>.
          </p>
          <div className="grid md:grid-cols-2 gap-6 text-left mb-10">
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Imersão — você já tem</span>
              <p className="mt-4">6h ao vivo. Você sai com o mapa, os agentes demonstrados, templates prontos.</p>
            </div>
            <div className="reveal tech-card ident-card">
              <span className="badge mb-4">Mesa — oferta desta página</span>
              <p className="mt-4">6h a mais, 72h depois. Seu setup destravado na sua tela, com seus clientes, seu contexto.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ESCASSEZ / URGÊNCIA */}
      <section className="py-16 md:py-20 bg-bgs border-y border-bgt">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Aviso honesto</p>
          <h2 className="reveal section-title mb-6">Essa página <span className="highlight-orange">só aparece agora.</span></h2>
          <p className="text-lg text-txts mb-8">
            A Mesa de Comando não está vendida em nenhum outro lugar. Só pra quem acabou de comprar o ingresso, só nessa tela.<br className="hidden md:inline" /> Fechou a aba, perdeu o acesso.
          </p>
          <VagasBar mesa={mesa} />
          <div className="mt-8">
            <button type="button" data-fallback-offer={mesa.offer_code} className="ticto-upsell-button btn-brutalist btn-brutalist-orange cta-delayed" onClick={() => { if (window === window.top) setTimeout(() => { window.location.href = mesa.checkout }, 400) }}>QUERO GARANTIR AGORA</button>
          </div>
        </div>
      </section>

      {/* FAQ MESA */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Dúvidas sobre a Mesa</p>
          <h2 className="reveal section-title text-center mb-14">Perguntas e <span className="highlight-orange">Respostas</span></h2>
          <div className="space-y-4">
            {mesaFaq.map(([q, a], i) => (
              <details key={i} className="faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* PRÓXIMOS PASSOS DA IMERSÃO */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-4xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">E sobre a imersão que você já comprou</p>
          <h2 className="reveal section-title text-center mb-6">Seus próximos <span className="highlight-orange">3 passos</span></h2>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-12">
            <div className="flex items-center gap-3">
              <span className="badge">Data</span>
              <p className="text-base font-black">Sábado, 2 de maio</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge">Horário</span>
              <p className="text-base font-black">10h às 17h</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['01', 'Confirmação no WhatsApp', 'Em minutos você recebe a confirmação da inscrição e o link do Zoom direto no seu WhatsApp. Sem e-mail.'],
              ['02', 'Lembretes automáticos', 'Ao longo da semana, mensagens chegam no seu WhatsApp: 1 dia antes, na véspera e 15 min antes da sala abrir. Zero chance de perder o link.'],
            ].map(([n, t, d]) => (
              <div key={n} className="reveal tech-card ident-card text-left">
                <p className="text-5xl font-black highlight-orange mb-4">{n}</p>
                <h3 className="text-xl font-black mb-2">{t}</h3>
                <p className="text-txts text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Última chamada</p>
          <h2 className="reveal section-title mb-6">
            Você pode sair daqui com <span className="highlight-orange">o mapa</span><br/>
            ou com <span className="highlight-orange">o mapa + a implementação</span>.
          </h2>
          <p className="text-lg text-txts mb-10">
            O mapa você já garantiu. A implementação assistida tá a um clique — e a {mesa.restantes} vagas de distância.
          </p>
          <span className="cta-stack">
            <button type="button" data-fallback-offer={mesa.offer_code} className="ticto-upsell-button btn-brutalist btn-brutalist-orange cta-delayed" onClick={() => { if (window === window.top) setTimeout(() => { window.location.href = mesa.checkout }, 400) }}>GARANTIR MINHA VAGA NA MESA — R${mesa.preco}</button>
            <VagasBar mesa={mesa} />
          </span>
          <p className="text-sm text-txts mt-6">Essa oferta não reabre · Fechou a aba, sumiu</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 bg-bgp border-t border-bgt text-center">
        <img src="/assets/LOGO.webp" alt="Logo" className="h-8 mx-auto mb-4 opacity-80" />
        <p className="text-txts text-sm">© 2026 Isaac Santos. Todos os direitos reservados.</p>
      </footer>

      </div>{/* /sections-delayed */}

      <LiveToast event={liveEvent} />
    </div>
  )
}

export default AppObrigado
