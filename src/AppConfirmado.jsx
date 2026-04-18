import { useEffect, useState } from 'react'
import { trackContact } from './lib/meta-tracking.js'

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
  const target = new Date('2026-05-02T10:00:00-03:00').getTime()
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-23 -21 682 682.66669" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="m544.386719 93.007812c-59.875-59.945312-139.503907-92.9726558-224.335938-93.007812-174.804687 0-317.070312 142.261719-317.140625 317.113281-.023437 55.894531 14.578125 110.457031 42.332032 158.550781l-44.992188 164.335938 168.121094-44.101562c46.324218 25.269531 98.476562 38.585937 151.550781 38.601562h.132813c174.785156 0 317.066406-142.273438 317.132812-317.132812.035156-84.742188-32.921875-164.417969-92.800781-224.359376zm-224.335938 487.933594h-.109375c-47.296875-.019531-93.683594-12.730468-134.160156-36.742187l-9.621094-5.714844-99.765625 26.171875 26.628907-97.269531-6.269532-9.972657c-26.386718-41.96875-40.320312-90.476562-40.296875-140.28125.054688-145.332031 118.304688-263.570312 263.699219-263.570312 70.40625.023438 136.589844 27.476562 186.355469 77.300781s77.15625 116.050781 77.132812 186.484375c-.0625 145.34375-118.304687 263.59375-263.59375 263.59375zm144.585938-197.417968c-7.921875-3.96875-46.882813-23.132813-54.148438-25.78125-7.257812-2.644532-12.546875-3.960938-17.824219 3.96875-5.285156 7.929687-20.46875 25.78125-25.09375 31.066406-4.625 5.289062-9.242187 5.953125-17.167968 1.984375-7.925782-3.964844-33.457032-12.335938-63.726563-39.332031-23.554687-21.011719-39.457031-46.960938-44.082031-54.890626-4.617188-7.9375-.039062-11.8125 3.476562-16.171874 8.578126-10.652344 17.167969-21.820313 19.808594-27.105469 2.644532-5.289063 1.320313-9.917969-.664062-13.882813-1.976563-3.964844-17.824219-42.96875-24.425782-58.839844-6.4375-15.445312-12.964843-13.359374-17.832031-13.601562-4.617187-.230469-9.902343-.277344-15.1875-.277344-5.28125 0-13.867187 1.980469-21.132812 9.917969-7.261719 7.933594-27.730469 27.101563-27.730469 66.105469s28.394531 76.683594 32.355469 81.972656c3.960937 5.289062 55.878906 85.328125 135.367187 119.648438 18.90625 8.171874 33.664063 13.042968 45.175782 16.695312 18.984374 6.03125 36.253906 5.179688 49.910156 3.140625 15.226562-2.277344 46.878906-19.171875 53.488281-37.679687 6.601563-18.511719 6.601563-34.375 4.617187-37.683594-1.976562-3.304688-7.261718-5.285156-15.183593-9.253906zm0 0" fillRule="evenodd"/>
    </svg>
  )
}

const WHATSAPP_SUPORTE = 'https://wa.me/5511999999999'

const lembretes = [
  { quando: 'Quinta 30/04 · 12h', o_que: 'Mensagem no seu WhatsApp com o link do Zoom e a checklist final do que preparar' },
  { quando: 'Sexta 01/05 · 20h', o_que: 'Último aviso: "amanhã é a imersão" — direto no seu WhatsApp, com o link cravado' },
  { quando: 'Sábado 02/05 · 9h45', o_que: 'Mensagem 15 minutos antes: "abriu a sala, entra" — pra ninguém perder o início' },
]

const prepararItens = [
  'Computador (Mac, Windows ou Linux — desktop, não mobile)',
  'Conta no Claude (free serve, Max/Pro é melhor pra quem já tem)',
  'Conexão estável — de preferência cabo, não Wi-Fi',
  'Acesso à sua conta de Meta Ads ou Google Ads (pra gente integrar ao vivo)',
  '6 horas de atenção real (10h às 17h, com pausa pra almoço) — sem reunião, sem cliente cobrando',
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
          <img src="/assets/LOGO.webp" alt="Logo" className="vsl-hero-logo" />
          <p className="vsl-hero-eyebrow">✓ Inscrição confirmada</p>
          <h1 className="vsl-hero-title">
            Tá dentro.<br/>
            <span className="highlight-orange">Sábado 02/05 é comigo.</span>
          </h1>
          <p className="vsl-hero-sub">
            Sua vaga tá garantida. Todos os avisos e o link da sala caem direto no seu <span style={{ color: '#fff', fontWeight: 700 }}>WhatsApp</span> — você não precisa fazer mais nada agora.
          </p>

          <div className="confirmado-meta">
            <div className="confirmado-meta-item">
              <span className="confirmado-meta-label">Data</span>
              <span className="confirmado-meta-value">Sábado, 02/05</span>
            </div>
            <span className="confirmado-meta-sep" />
            <div className="confirmado-meta-item">
              <span className="confirmado-meta-label">Horário</span>
              <span className="confirmado-meta-value">10h às 17h (horário de Brasília)</span>
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
        <p className="text-sm text-txts mt-6">…pra você sair com as 5 skills rodando na sua máquina às 17h.</p>
      </section>

      {/* COMO VAI FUNCIONAR */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Pra você ficar tranquilo</p>
          <h2 className="reveal section-title text-center mb-14">Como vai funcionar <span className="highlight-orange">daqui até sábado</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['01', 'Lembretes no WhatsApp', 'Ao longo da semana chegam mensagens automáticas avisando: o dia antes, na véspera e 15 minutos antes da sala abrir. Zero chance de esquecer.'],
              ['02', 'Sábado 10h', 'Abro a sala 9h45. A gente começa 10h em ponto — almoça juntos na pausa e sai às 17h com as 5 skills + Skill Master + Obsidian rodando na sua máquina.'],
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

      {/* O QUE PREPARAR */}
      <section className="py-20 md:py-28 bg-bgs border-y border-bgt">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-center uppercase tracking-widest text-sm font-bold eyebrow mb-3">Checklist</p>
          <h2 className="reveal section-title text-center mb-14">
            O que ter do lado <span className="highlight-orange">sábado 10h</span>
          </h2>
          <ul className="space-y-4 md:w-fit md:mx-auto">
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
          <a href={WHATSAPP_SUPORTE} target="_blank" rel="noopener noreferrer" onClick={() => trackContact('Suporte WhatsApp')} className="btn-whatsapp btn-whatsapp--small">
            <WhatsAppLogo size={18} />
            FALAR COMIGO NO WHATSAPP
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 bg-bgp border-t border-bgt text-center">
        <img src="/assets/LOGO.webp" alt="Logo" className="h-8 mx-auto mb-4 opacity-80" />
        <p className="text-txts text-sm">© 2026 Isaac Santos. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

export default AppConfirmado
