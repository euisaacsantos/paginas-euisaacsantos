import { useEffect, useState, useCallback } from 'react'
import PhoneInput, { getPhoneDigits, getMinDigits } from './components/lead/PhoneInput.jsx'
import { getLeadData, saveLeadData, getUtmParams, sendBeacon, buildRedirectUrl } from './components/lead/leadStorage.js'
import { sendCAPI } from './lib/meta-tracking.js'

function registerCheckout(payload) {
  sendBeacon('/api/checkout', { ...payload, ...getUtmParams() })
}

async function fetchMentoriaUrl() {
  try {
    const r = await fetch('/api/evento-config')
    const j = await r.json()
    return j?.mentoria_checkout_url || null
  } catch {
    return null
  }
}

export default function AppCheckout() {
  const [ready, setReady]           = useState(false)
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Auto-redirect com dados salvos
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const lead = getLeadData()
      if (lead && lead.email && lead.phone) {
        registerCheckout({ ...lead, source: 'localStorage' })
        sendCAPI('InitiateCheckout', { content_name: 'Mentoria Gestor de Tráfego', currency: 'BRL' })
        const baseUrl = await fetchMentoriaUrl()
        if (cancelled) return
        if (baseUrl) {
          window.location.href = buildRedirectUrl(baseUrl, lead) || baseUrl
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
      const lead = { email, phone, name: name.trim() || null }
      registerCheckout({ ...lead, source: 'form' })
      sendCAPI('InitiateCheckout', { content_name: 'Mentoria Gestor de Tráfego', currency: 'BRL' })
      saveLeadData(lead)
      const baseUrl = await fetchMentoriaUrl()
      if (baseUrl) {
        window.location.href = buildRedirectUrl(baseUrl, lead) || baseUrl
      } else {
        setError('Link de pagamento ainda não está disponível. Tente novamente em instantes.')
        setSubmitting(false)
      }
    } catch {
      setError('Erro ao processar. Tente novamente.')
      setSubmitting(false)
    }
  }, [name, email, phone])

  if (!ready) return null

  return (
    <div className="lead-shell">
      <div className="lead-card">
        <div className="lead-icon-wrap">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" />
          </svg>
        </div>

        <h1 className="lead-title">
          Garantir minha vaga na <span style={{ color: '#FF0000' }}>Mentoria</span>
        </h1>
        <p className="lead-subtitle">
          Preencha pra ser redirecionado pro pagamento seguro com seus dados pré-preenchidos.
        </p>

        <form className="lead-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lead-input"
          />
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
            {submitting ? 'REDIRECIONANDO...' : 'IR PARA O PAGAMENTO'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <p className="lead-disclaimer">
          Pagamento processado com segurança. Seus dados não são compartilhados.
        </p>
      </div>
    </div>
  )
}
