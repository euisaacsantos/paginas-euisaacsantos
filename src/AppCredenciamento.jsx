import { useEffect, useState, useCallback } from 'react'
import PhoneInput, { getPhoneDigits, getMinDigits } from './components/lead/PhoneInput.jsx'
import { getLeadData, saveLeadData, getUtmParams, sendBeacon } from './components/lead/leadStorage.js'
import { sendCAPI } from './lib/meta-tracking.js'

function registerAccess(payload) {
  sendBeacon('/api/credenciamento', { ...payload, ...getUtmParams() })
}

async function fetchZoomUrl() {
  try {
    const r = await fetch('/api/evento-config')
    const j = await r.json()
    return j?.zoom_url || null
  } catch {
    return null
  }
}

export default function AppCredenciamento() {
  const [ready, setReady]           = useState(false)
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Auto-redirect se já tiver lead salvo no localStorage
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const lead = getLeadData()
      if (lead) {
        registerAccess({ email: lead.email, phone: lead.phone, source: 'localStorage' })
        sendCAPI('Lead', { content_name: 'Credenciamento Imersão' })
        const zoomUrl = await fetchZoomUrl()
        if (cancelled) return
        if (zoomUrl) {
          window.location.href = zoomUrl
          return
        }
      }
      if (!cancelled) setReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError('')

    if (getPhoneDigits(phone).length < getMinDigits(phone)) {
      setError('Informe um WhatsApp válido com DDD.')
      return
    }

    setSubmitting(true)
    try {
      registerAccess({ email, phone, source: 'form' })
      sendCAPI('Lead', { content_name: 'Credenciamento Imersão' })
      saveLeadData({ email, phone })
      const zoomUrl = await fetchZoomUrl()
      if (zoomUrl) {
        window.location.href = zoomUrl
      } else {
        setError('Link da imersão ainda não está disponível. Tente novamente em instantes.')
        setSubmitting(false)
      }
    } catch {
      setError('Erro ao processar. Tente novamente.')
      setSubmitting(false)
    }
  }, [email, phone])

  if (!ready) return null

  return (
    <div className="lead-shell">
      <div className="lead-card">
        <div className="lead-icon-wrap">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <img src="/assets/LOGO.png" alt="Claude para Gestores de Tráfego" className="lead-logo-img" />

        <h1 className="lead-title">
          Acesso à <span style={{ color: '#FF0000' }}>Imersão</span>
        </h1>
        <p className="lead-subtitle">
          Preencha pra entrar na sala ao vivo. Você vai ser redirecionado direto pro link do Zoom.
        </p>

        <form className="lead-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Seu melhor e-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="lead-input"
          />
          <PhoneInput value={phone} onChange={setPhone} />

          {error && <div className="lead-error">{error}</div>}

          <button type="submit" disabled={submitting} className="lead-cta">
            {submitting ? 'ENTRANDO...' : 'ENTRAR NA SALA'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <p className="lead-disclaimer">
          Seus dados são usados só pra contar quem entrou no evento. Não compartilhamos com ninguém.
        </p>
      </div>
    </div>
  )
}
