import { useEffect, useState } from 'react'

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

function Countdown() {
  const { days, hours, mins, secs } = useCountdown()
  return (
    <div className="countdown-wrap">
      <div className="counter-box"><span className="counter-num">{days}</span><span className="counter-lbl">Dias</span></div>
      <span className="countdown-sep">:</span>
      <div className="counter-box"><span className="counter-num">{hours}</span><span className="counter-lbl">Horas</span></div>
      <span className="countdown-sep">:</span>
      <div className="counter-box"><span className="counter-num">{mins}</span><span className="counter-lbl">Min</span></div>
      <span className="countdown-sep">:</span>
      <div className="counter-box"><span className="counter-num">{secs}</span><span className="counter-lbl">Seg</span></div>
    </div>
  )
}

function WhatsAppLogo({ size = 20 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.25.615 4.344 1.684 6.14L4 29l8.05-1.623A11.94 11.94 0 0 0 16.001 27c6.627 0 12-5.373 12-12S22.629 3 16.001 3zm0 21.818a9.82 9.82 0 0 1-5.004-1.38l-.358-.213-4.78.963.969-4.665-.234-.362a9.807 9.807 0 0 1-1.5-5.16c0-5.437 4.42-9.857 9.857-9.857s9.858 4.42 9.858 9.858-4.42 9.857-9.858 9.857zm5.376-7.385c-.295-.147-1.742-.859-2.013-.958-.27-.098-.468-.147-.664.148-.197.294-.762.958-.935 1.155-.172.197-.344.221-.639.074-.295-.147-1.245-.458-2.37-1.461-.876-.782-1.467-1.748-1.638-2.043-.172-.295-.018-.454.13-.601.133-.132.295-.344.442-.517.148-.172.197-.294.295-.49.098-.197.05-.369-.025-.517-.074-.148-.664-1.597-.911-2.187-.24-.574-.484-.497-.664-.506-.172-.008-.369-.01-.566-.01a1.08 1.08 0 0 0-.787.369c-.27.294-1.032 1.008-1.032 2.457 0 1.45 1.057 2.85 1.204 3.047.147.197 2.082 3.18 5.048 4.457.705.304 1.255.486 1.685.622.708.225 1.353.193 1.862.117.568-.085 1.742-.712 1.989-1.4.247-.689.247-1.279.172-1.4-.074-.12-.27-.196-.565-.343z"/>
    </svg>
  )
}

// Placeholders — substituir quando tiver os links reais
const WHATSAPP_SUPORTE = 'https://wa.me/5511999999999'
const AULA_PREP_URL = 'https://link-da-aula-preparatoria'

const lembretes = [
  { quando: 'Quinta 23/04 · 12h', o_que: 'Mensagem no seu WhatsApp com o link do Zoom e a checklist final do que preparar' },
  { quando: 'Sexta 24/04 · 20h', o_que: 'Último aviso: "amanhã é a imersão" — direto no seu WhatsApp, com o link cravado' },
  { quando: 'Sábado 25/04 · 8h45', o_que: 'Mensagem 15 minutos antes: "abriu a sala, entra" — pra ninguém perder o início' },
]

const prepararItens = [
  'Computador (Mac, Windows ou Linux — desktop, não mobile)',
  'Conta no Claude (free serve, Max/Pro é melhor pra quem já tem)',
  'Conexão estável — de preferência cabo, não Wi-Fi',
  'Acesso à sua conta de Meta Ads ou Google Ads (pra gente integrar ao vivo)',
  '3 horas de atenção real (9h às 12h) — sem reunião, sem cliente cobrando',
]

function AppConfirmado() {
  useReveal()

  return (
    <div className="min-h-screen">
      {/* PROGRESS BAR — 100% concluído */}
      <div className="progress-topbar">
        <div className="progress-topbar-inner">
          <div className="progress-topbar-label">
            <span className="progress-topbar-step">ETAPA 2 DE 2</span>
            <span className="progress-topbar-pct progress-topbar-pct--done">✓ INSCRIÇÃO 100% CONCLUÍDA</span>
          </div>
          <div className="progress-topbar-bar">
            <div className="progress-topbar-fill" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="vsl-hero relative overflow-hidden">
        <div className="vsl-hero-container" style={{ paddingBottom: 40 }}>
          <img src="/assets/LOGO.png" alt="Logo" className="vsl-hero-logo" />
          <p className="vsl-hero-eyebrow">✓ Inscrição confirmada</p>
          <h1 className="vsl-hero-title">
            Tá dentro.<br/>
            <span className="highlight-orange">Sábado 25/04 é comigo.</span>
          </h1>
          <p className="vsl-hero-sub">
            Sua vaga tá garantida. Todos os avisos e o link da sala caem direto no seu <span style={{ color: '#fff', fontWeight: 700 }}>WhatsApp</span> — você não precisa fazer mais nada agora.
          </p>

          <a href={AULA_PREP_URL} target="_blank" rel="noopener noreferrer" className="btn-brutalist btn-brutalist-orange">
            ACESSAR AULA PREPARATÓRIA
          </a>

          <div className="confirmado-meta">
            <div className="confirmado-meta-item">
              <span className="confirmado-meta-label">Data</span>
              <span className="confirmado-meta-value">Sábado, 25/04</span>
            </div>
            <span className="confirmado-meta-sep" />
            <div className="confirmado-meta-item">
              <span className="confirmado-meta-label">Horário</span>
              <span className="confirmado-meta-value">9h às 12h (horário de Brasília)</span>
            </div>
            <span className="confirmado-meta-sep" />
            <div className="confirmado-meta-item">
              <span className="confirmado-meta-label">Onde</span>
              <span className="confirmado-meta-value">Zoom (link chega no WhatsApp)</span>
            </div>
          </div>
        </div>
      </section>

      {/* COUNTDOWN */}
      <section className="py-12 md:py-16 px-5 text-center" style={{ backgroundColor: '#09090B' }}>
        <p className="uppercase tracking-widest text-sm text-txts mb-6">Faltam</p>
        <Countdown />
        <p className="text-sm text-txts mt-6">…pra você sair com 3 agentes rodando na sua máquina.</p>
      </section>

      {/* COMO VAI FUNCIONAR */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Pra você ficar tranquilo</p>
          <h2 className="reveal section-title text-center mb-14">Como vai funcionar <span className="highlight-orange">daqui até sábado</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['01', 'Agora', 'A aula preparatória já tá liberada. Enquanto sábado não chega, ela te deixa fluente no Claude Code em 30 minutos.'],
              ['02', 'Lembretes no WhatsApp', 'Ao longo da semana chegam mensagens automáticas avisando: o dia antes, na véspera e 15 minutos antes da sala abrir. Zero chance de esquecer.'],
              ['03', 'Sábado 9h', 'Abro a sala 8h45. A gente começa 9h em ponto e sai meio-dia com 3 agentes + cérebro Obsidian rodando na sua máquina.'],
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

      {/* AULA PREPARATÓRIA */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Enquanto sábado não chega</p>
          <h2 className="reveal section-title mb-6">
            Tem <span className="highlight-orange">uma aula de 30 minutos</span><br/>
            te esperando.
          </h2>
          <p className="text-lg text-txts max-w-2xl mx-auto mb-10">
            Claude Code do zero, pra quem nunca abriu a ferramenta. Não é pré-requisito, mas quem assiste chega sábado operando o dobro mais rápido. Clica no botão abaixo pra acessar.
          </p>
          <a href={AULA_PREP_URL} target="_blank" rel="noopener noreferrer" className="btn-brutalist">
            ACESSAR AULA PREPARATÓRIA
          </a>
        </div>
      </section>

      {/* O QUE PREPARAR */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Checklist</p>
          <h2 className="reveal section-title text-center mb-14">
            O que ter do lado <span className="highlight-orange">sábado 9h</span>
          </h2>
          <ul className="space-y-4">
            {prepararItens.map((item, i) => (
              <li key={i} className="flex gap-4 items-start reveal">
                <span className="preparar-check">✓</span>
                <span className="text-white text-base md:text-lg">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LEMBRETES QUE VÃO CHEGAR */}
      <section className="py-20 md:py-28 bg-grid-pattern">
        <div className="max-w-4xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Nada vai passar batido</p>
          <h2 className="reveal section-title text-center mb-4">
            Os lembretes que <span className="highlight-orange">você vai receber no WhatsApp</span>
          </h2>
          <p className="text-center text-lg text-txts max-w-2xl mx-auto mb-14">
            Pra você relaxar: a agenda do que vai cair no seu WhatsApp daqui até sábado.
          </p>
          <ol className="timeline">
            {lembretes.map((l, i) => (
              <li key={i} className="timeline-item reveal">
                <div className="timeline-marker">
                  <span className="timeline-time">{l.quando.split(' · ')[1] || ''}</span>
                  <span className="timeline-dot" />
                </div>
                <div className="timeline-card">
                  <span className="badge mb-3">{l.quando}</span>
                  <p className="text-txts mt-2">{l.o_que}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SUPORTE */}
      <section className="py-16 md:py-20 bg-bgs border-y border-bgt">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <p className="uppercase tracking-widest text-sm font-bold eyebrow mb-3">Precisa de algo?</p>
          <h2 className="reveal section-title mb-4">
            Qualquer dúvida, <span className="highlight-orange">fala comigo</span>.
          </h2>
          <p className="text-txts mb-8">
            Manda mensagem no WhatsApp que eu respondo rápido. Sem formulário, sem ticket.
          </p>
          <a href={WHATSAPP_SUPORTE} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-whatsapp--small">
            <WhatsAppLogo size={18} />
            FALAR COMIGO NO WHATSAPP
          </a>
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

export default AppConfirmado
