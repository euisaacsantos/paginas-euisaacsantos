import { getRedis } from './_redis.js'
import { getSupabase } from './_supabase.js'
import { sendCapiEvent, splitName } from './_meta-capi.js'

// Extrai o primeiro valor truthy de uma lista de paths no objeto
function pick(obj, paths) {
  for (const p of paths) {
    const v = p.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

// Ticto v2: item.offer_code (singular)
function extractOfferCode(body) {
  return (
    pick(body, [
      'item.offer_code',
      'item.offer.code',
      'items.0.offer_code',
      'items.0.offer.code',
      'offer.code',
      'offer_code',
      'product.offer_code',
      'transaction.offer_code',
    ]) ||
    (body.checkout_url && String(body.checkout_url).split('/').pop().split('?')[0]) ||
    null
  )
}

function extractTransactionId(body) {
  return pick(body, [
    'transaction.hash',
    'order.transaction_hash',
    'transaction.id',
    'order.hash',
    'order.id',
    'order_id',
    'hash',
    'id',
  ])
}

function extractCustomer(body) {
  return {
    email: pick(body, ['customer.email', 'email', 'buyer.email', 'cliente.email']),
    telefone: pick(body, [
      'customer.phone.number',
      'customer.phone',
      'customer.phone_number',
      'customer.cellphone',
      'phone',
      'buyer.phone',
      'cliente.telefone',
    ]),
    nome: pick(body, ['customer.name', 'customer.full_name', 'name', 'buyer.name', 'cliente.nome']),
  }
}

// Ticto preenche UTMs vazios com string literal "Não Informado" — normaliza pra null
function normalizeUtm(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (['não informado', 'nao informado', 'not informed', 'none', 'null', 'undefined', 'n/a'].includes(lower)) return null
  return s
}
function extractUtms(body) {
  return {
    utm_source: normalizeUtm(pick(body, ['tracking.utm_source', 'utm.source', 'utm_source'])),
    utm_medium: normalizeUtm(pick(body, ['tracking.utm_medium', 'utm.medium', 'utm_medium'])),
    utm_campaign: normalizeUtm(pick(body, ['tracking.utm_campaign', 'utm.campaign', 'utm_campaign'])),
    utm_content: normalizeUtm(pick(body, ['tracking.utm_content', 'utm.content', 'utm_content'])),
    utm_term: normalizeUtm(pick(body, ['tracking.utm_term', 'utm.term', 'utm_term'])),
    fbclid: normalizeUtm(pick(body, ['tracking.fbclid', 'fbclid', 'utm.fbclid'])),
  }
}

function extractValor(body) {
  // Ticto v2: order.paid_amount em CENTAVOS
  if (body.order?.paid_amount != null) {
    const n = Number(body.order.paid_amount)
    if (Number.isFinite(n)) return n / 100
  }
  const raw = pick(body, [
    'amount',
    'value',
    'price',
    'total',
    'transaction.amount',
    'order.total',
    'item.price',
    'items.0.price',
  ])
  if (raw === null) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return n >= 10000 ? n / 100 : n
}

// Session lookup: src=sess_<uuid> propagado do click no CTA pro checkout Ticto.
// fbp/fbc/ip/ua/geo vêm do Supabase (cct_sessoes_checkout), não mais do payload.
function extractSrcSessionId(body) {
  const src = pick(body, ['tracking.src', 'src'])
  if (!src) return null
  const s = String(src)
  return s.startsWith('sess_') ? s.slice(5) : null
}
function extractCpf(body) {
  return pick(body, ['customer.cpf', 'customer.document', 'customer.cnpj', 'buyer.cpf'])
}
function extractGeoFromPayload(body) {
  return {
    city: pick(body, ['customer.address.city', 'customer.city', 'address.city']),
    region: pick(body, ['customer.address.state', 'customer.state', 'address.state']),
    country: pick(body, ['customer.address.country', 'customer.country', 'address.country']),
    zip: pick(body, ['customer.address.zip_code', 'customer.zip_code', 'customer.zip']),
  }
}
function extractClientIpUa(body) {
  return {
    ip: pick(body, ['customer.ip', 'customer.ip_address', 'client_ip_address', 'ip']),
    ua: pick(body, ['customer.user_agent', 'user_agent', 'client_user_agent']),
  }
}

function sanitizeHeaders(headers) {
  const keep = {}
  for (const [k, v] of Object.entries(headers || {})) {
    const key = k.toLowerCase()
    if (key === 'authorization' || key === 'cookie') continue
    keep[key] = typeof v === 'string' && v.length > 500 ? v.slice(0, 500) + '...' : v
  }
  return keep
}

async function logRaw(supabase, { body, query, headers, responseStatus, responseBody, error }) {
  try {
    // Remove token da query log
    const q = { ...(query || {}) }
    if (q.token) q.token = '***'
    await supabase.from('cct_webhook_raw').insert({
      endpoint: 'ticto-webhook',
      method: 'POST',
      query: q,
      headers: sanitizeHeaders(headers),
      body: body || null,
      response_status: responseStatus,
      response_body: responseBody,
      processing_error: error || null,
    })
  } catch (e) {
    console.error('[ticto-webhook] falha ao gravar raw log:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = req.query.token
  if (!process.env.TICTO_WEBHOOK_SECRET || token !== process.env.TICTO_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  let supabase
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

  // Respond helper — grava raw log + envia resposta
  async function respond(status, payload, error) {
    try {
      if (supabase) {
        await logRaw(supabase, {
          body,
          query: req.query,
          headers: req.headers,
          responseStatus: status,
          responseBody: payload,
          error,
        })
      }
    } catch {}
    return res.status(status).json(payload)
  }

  try {
    supabase = getSupabase()
  } catch (err) {
    // Sem Supabase não dá pra logar, retorna 500 pra Ticto retentar
    console.error('[ticto-webhook] Supabase indisponível:', err.message)
    return res.status(500).json({ error: 'supabase unavailable' })
  }

  try {
    const status = (body.status || body.order_status || body.transaction?.status || '')
      .toString()
      .toLowerCase()

    const purchaseStatuses  = ['approved', 'paid', 'authorized', 'aprovado', 'pago']
    const pixStatuses       = ['waiting_payment', 'pix_generated', 'aguardando_pagamento', 'pending', 'pendente', 'pix']
    const abandonStatuses   = ['abandoned', 'abandoned_cart', 'abandono', 'checkout_abandoned', 'cancelled', 'cancelado']

    const isPurchase = purchaseStatuses.includes(status)
    const isPix      = pixStatuses.includes(status)
    const isAbandon  = abandonStatuses.includes(status)

    // Evento desconhecido — ignora sem retentar
    if (status && !isPurchase && !isPix && !isAbandon) {
      return respond(200, { ignored: true, reason: `status=${status}` })
    }

    const offerCode = extractOfferCode(body)
    const transactionId = extractTransactionId(body)

    if (!offerCode || !transactionId) {
      const missing = []
      if (!offerCode) missing.push('offer_code')
      if (!transactionId) missing.push('transaction_id')
      // 200 pra Ticto NÃO retentar — o payload cru fica salvo em cct_webhook_raw pra análise
      return respond(
        200,
        { ignored: true, reason: `campos ausentes: ${missing.join(', ')}` },
        `extraction failed: missing ${missing.join(', ')}`
      )
    }

    const r = getRedis()
    const [imersaoConfigStr, mesaConfigStr] = await Promise.all([
      r.get('imersao:config'),
      r.get('mesa:config'),
    ])
    const lotes = JSON.parse(imersaoConfigStr || '[]')
    const mesaConfig = JSON.parse(mesaConfigStr || '{}')

    const loteMatch = lotes.find((l) => l.offer_code === offerCode)
    let produtoTipo, loteId = null, incrementoRedis = null

    if (loteMatch) {
      produtoTipo = 'imersao'
      loteId = loteMatch.id
      incrementoRedis = 'imersao:vendas'
    } else if (mesaConfig.offer_code && mesaConfig.offer_code === offerCode) {
      produtoTipo = 'mesa'
      incrementoRedis = 'mesa:vendas'
    } else {
      produtoTipo = 'order_bump'
    }

    const customer = extractCustomer(body)

    // ── PIX gerado ou abandono de checkout ─────────────────────────────────
    // Grava em cct_leads_pendentes e envia InitiateCheckout à CAPI.
    if (isPix || isAbandon) {
      const kind = isPix ? 'pix_generated' : 'abandoned_cart'
      const utms = extractUtms(body)
      const valor = extractValor(body) ?? (loteMatch ? loteMatch.preco : mesaConfig.preco) ?? 0
      const cpf = extractCpf(body)
      const sessionId = extractSrcSessionId(body)

      // Verifica se já existe compra aprovada — não sobrescreve com lead
      const { data: vendaExistente } = await supabase
        .from('cct_vendas')
        .select('id')
        .eq('ticto_transaction_id', String(transactionId))
        .maybeSingle()

      if (vendaExistente) {
        return respond(200, { ok: true, ignored: true, reason: 'already_purchased', transaction_id: transactionId })
      }

      // Lookup de sessão (fbp/fbc/ip/ua/geo/external_id)
      let sessaoData = null
      if (sessionId) {
        const { data: sess } = await supabase
          .from('cct_sessoes_checkout')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle()
        if (sess) sessaoData = sess
      }

      // PIX expira em 30 min; abandono em 24h
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + (isPix ? 30 : 60 * 24))

      const { error: upsertError } = await supabase
        .from('cct_leads_pendentes')
        .upsert(
          {
            kind,
            ticto_transaction_id: String(transactionId),
            offer_code: offerCode,
            produto_tipo: produtoTipo,
            lote_id: loteId,
            email: customer.email,
            telefone: customer.telefone,
            nome: customer.nome,
            cpf: cpf || null,
            valor,
            utm_source:   utms.utm_source   || null,
            utm_medium:   utms.utm_medium   || null,
            utm_campaign: utms.utm_campaign || null,
            utm_content:  utms.utm_content  || null,
            utm_term:     utms.utm_term     || null,
            fbclid:       utms.fbclid       || null,
            session_id:   sessionId         || null,
            expires_at:   expiresAt.toISOString(),
            raw_payload:  body,
          },
          { onConflict: 'ticto_transaction_id' }
        )

      if (upsertError) {
        console.error('[ticto-webhook] erro upsert leads_pendentes:', upsertError)
        return respond(500, { error: 'leads_pendentes insert failed', details: upsertError.message }, upsertError.message)
      }

      // ── CAPI: InitiateCheckout (fire-and-forget — não bloqueia resposta) ──
      // event_id único por transação → evita deduplica dupla se PIX e abandono chegarem
      const payloadIpUa = extractClientIpUa(body)
      const payloadGeo  = extractGeoFromPayload(body)
      const { fn, ln }  = splitName(customer.nome)
      const contentName = loteMatch
        ? loteMatch.nome
        : produtoTipo === 'mesa' ? 'Mesa de Comando' : 'Order Bump'

      sendCapiEvent({
        event_name: 'InitiateCheckout',
        event_id: `initiatecheckout_${transactionId}`,
        event_source_url: pick(body, ['checkout_url', 'source_url']) || undefined,
        user_data: {
          email:              customer.email,
          phone:              customer.telefone,
          fn,
          ln,
          external_id:        sessaoData?.external_id || cpf || null,
          fbp:                sessaoData?.fbp         || null,
          fbc:                sessaoData?.fbc         || utms.fbclid || null,
          client_ip_address:  sessaoData?.client_ip_address || payloadIpUa.ip  || null,
          client_user_agent:  sessaoData?.client_user_agent || payloadIpUa.ua  || null,
          city:               sessaoData?.city   || payloadGeo.city    || null,
          region:             sessaoData?.region || payloadGeo.region  || null,
          country:            sessaoData?.country|| payloadGeo.country || null,
          zip:                sessaoData?.zip    || payloadGeo.zip     || null,
        },
        custom_data: {
          currency:     'BRL',
          value:        Number(valor) || 0,
          content_name: contentName,
          content_type: 'product',
          ...(loteMatch && { content_ids: [String(loteMatch.offer_code)] }),
          num_items:    1,
        },
      }).then((r) => {
        if (!r.sent) console.warn('[ticto-webhook] InitiateCheckout CAPI falhou:', r)
      }).catch((e) => console.error('[ticto-webhook] InitiateCheckout CAPI erro:', e.message))

      return respond(200, { ok: true, kind, transaction_id: transactionId, capi_initiate_checkout: 'fired' })
    }
    const utms = extractUtms(body)
    const valor = extractValor(body) ?? (loteMatch ? loteMatch.preco : mesaConfig.preco) ?? 0

    // Lookup de sessão (src=sess_<uuid> propagado do click no CTA)
    // Traz fbp/fbc/ip/ua/geo/external_id gravados no momento do click.
    let sessaoData = null
    const sessionId = extractSrcSessionId(body)
    if (sessionId) {
      const { data: sess } = await supabase
        .from('cct_sessoes_checkout')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()
      if (sess) sessaoData = sess
    }

    // Duplicata
    const { data: existing } = await supabase
      .from('cct_vendas')
      .select('id')
      .eq('ticto_transaction_id', String(transactionId))
      .maybeSingle()

    if (existing) {
      return respond(200, {
        ok: true,
        duplicate: true,
        transaction_id: transactionId,
      })
    }

    // Purchase CAPI (server-side) ANTES do INSERT — resultado vai direto nas colunas
    // meta_capi_* do cct_vendas, dashboard consulta sem parsear JSON do raw.
    // Fonte primária = cct_sessoes_checkout (gravado no click); fallback = payload Ticto.
    let capiResult = null
    try {
      const { fn, ln } = splitName(customer.nome)
      const payloadIpUa = extractClientIpUa(body)
      const payloadGeo = extractGeoFromPayload(body)

      const fbp = sessaoData?.fbp || null
      const fbc = sessaoData?.fbc || null
      const client_ip_address = sessaoData?.client_ip_address || payloadIpUa.ip || null
      const client_user_agent = sessaoData?.client_user_agent || payloadIpUa.ua || null
      const city = sessaoData?.city || payloadGeo.city || null
      const region = sessaoData?.region || payloadGeo.region || null
      const country = sessaoData?.country || payloadGeo.country || null
      const zip = sessaoData?.zip || payloadGeo.zip || null
      // external_id: prefere UUID da sessão (amarra com PageView/AddToCart), fallback CPF
      const external_id = sessaoData?.external_id || extractCpf(body) || null

      const contentName = loteMatch
        ? loteMatch.nome
        : produtoTipo === 'mesa'
        ? 'Mesa de Comando'
        : 'Order Bump'

      capiResult = await sendCapiEvent({
        event_name: 'Purchase',
        event_id: `purchase_${transactionId}`,
        event_source_url: pick(body, ['checkout_url', 'source_url']) || undefined,
        user_data: {
          email: customer.email,
          phone: customer.telefone,
          fn,
          ln,
          external_id,
          fbp,
          fbc,
          client_ip_address,
          client_user_agent,
          city,
          region,
          country,
          zip,
        },
        custom_data: {
          currency: 'BRL',
          value: Number(valor) || 0,
          content_name: contentName,
          content_type: 'product',
          ...(loteMatch && { content_ids: [String(loteMatch.offer_code)] }),
        },
      })
      if (!capiResult.sent) {
        console.warn('[ticto-webhook] Purchase CAPI não enviado:', capiResult)
      }
    } catch (capiErr) {
      console.error('[ticto-webhook] falha Purchase CAPI:', capiErr.message)
      capiResult = { sent: false, error: capiErr.message }
    }

    // INSERT cct_vendas com resultado CAPI nas colunas dedicadas
    const { error: insertError } = await supabase
      .from('cct_vendas')
      .insert({
        ticto_transaction_id: String(transactionId),
        status: status || 'approved',
        offer_code: offerCode,
        produto_tipo: produtoTipo,
        lote_id: loteId,
        valor,
        email: customer.email,
        telefone: customer.telefone,
        nome: customer.nome,
        utm_source: utms.utm_source || sessaoData?.utm_source || null,
        utm_medium: utms.utm_medium || sessaoData?.utm_medium || null,
        utm_campaign: utms.utm_campaign || sessaoData?.utm_campaign || null,
        utm_content: utms.utm_content || sessaoData?.utm_content || null,
        utm_term: utms.utm_term || sessaoData?.utm_term || null,
        fbclid: utms.fbclid || sessaoData?.fbclid || null,
        session_id: sessaoData?.session_id || null,
        external_id: sessaoData?.external_id || null,
        meta_capi_sent: capiResult?.sent === true,
        meta_capi_fbtrace_id: capiResult?.fbtrace_id || null,
        meta_capi_error: capiResult?.sent === false
          ? { reason: capiResult.reason, status: capiResult.status, error: capiResult.error }
          : null,
        raw_payload: body,
      })

    if (insertError) {
      console.error('[ticto-webhook] erro INSERT:', insertError)
      return respond(
        500,
        { error: 'supabase insert failed', details: insertError.message },
        insertError.message
      )
    }

    // Processa order bumps incluídos no mesmo payload (bumps[] da Ticto)
    if (isPurchase && Array.isArray(body.bumps) && body.bumps.length > 0) {
      for (const bump of body.bumps) {
        const bumpCode = bump.offer_code || bump.offer?.code
        if (!bumpCode) continue
        // ID único = transação pai + offer_code do bump — garante idempotência
        const bumpTxId = `${transactionId}_bump_${bumpCode}`
        const bumpValor = parseFloat(bump.offer_price) || 0
        const { data: bumpExists } = await supabase
          .from('cct_vendas').select('id').eq('ticto_transaction_id', bumpTxId).maybeSingle()
        if (!bumpExists) {
          await supabase.from('cct_vendas').insert({
            ticto_transaction_id: bumpTxId,
            status: status || 'approved',
            offer_code: bumpCode,
            produto_tipo: 'order_bump',
            lote_id: null,
            valor: bumpValor,
            email: customer.email,
            telefone: customer.telefone,
            nome: customer.nome,
            utm_source:   utms.utm_source   || sessaoData?.utm_source   || null,
            utm_medium:   utms.utm_medium   || sessaoData?.utm_medium   || null,
            utm_campaign: utms.utm_campaign || sessaoData?.utm_campaign || null,
            utm_content:  utms.utm_content  || sessaoData?.utm_content  || null,
            utm_term:     utms.utm_term     || sessaoData?.utm_term     || null,
            fbclid:       utms.fbclid       || sessaoData?.fbclid       || null,
            session_id:   sessaoData?.session_id || null,
            external_id:  sessaoData?.external_id || null,
            meta_capi_sent: false,
            raw_payload: { bump, parent_transaction_id: String(transactionId) },
          })
        }
      }
    }

    // Marca lead pendente como convertido (fire-and-forget — não bloqueia resposta)
    supabase
      .from('cct_leads_pendentes')
      .update({ converted_at: new Date().toISOString() })
      .eq('ticto_transaction_id', String(transactionId))
      .is('converted_at', null)
      .then(({ error: e }) => {
        if (e) console.warn('[ticto-webhook] falha ao marcar lead convertido:', e.message)
      })

    let vendasRedis = null
    if (incrementoRedis) {
      vendasRedis = await r.incr(incrementoRedis)
    }

    return respond(200, {
      ok: true,
      kind: produtoTipo,
      lote: loteId,
      transaction_id: transactionId,
      supabase_saved: true,
      redis_vendas: vendasRedis,
      capi_purchase: capiResult,
    })
  } catch (err) {
    console.error('[api/ticto-webhook]', err)
    return respond(500, { error: err.message }, err.message)
  }
}
