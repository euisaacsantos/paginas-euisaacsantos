import { getRedis } from './_redis.js'
import { getSupabase } from './_supabase.js'

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

function extractUtms(body) {
  return {
    utm_source: pick(body, ['tracking.utm_source', 'utm.source', 'utm_source']),
    utm_medium: pick(body, ['tracking.utm_medium', 'utm.medium', 'utm_medium']),
    utm_campaign: pick(body, ['tracking.utm_campaign', 'utm.campaign', 'utm_campaign']),
    utm_content: pick(body, ['tracking.utm_content', 'utm.content', 'utm_content']),
    utm_term: pick(body, ['tracking.utm_term', 'utm.term', 'utm_term']),
    fbclid: pick(body, ['tracking.fbclid', 'fbclid', 'utm.fbclid']),
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
    const validStatuses = ['approved', 'paid', 'authorized', 'aprovado', 'pago']
    if (status && !validStatuses.includes(status)) {
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
    const utms = extractUtms(body)
    const valor = extractValor(body) ?? (loteMatch ? loteMatch.preco : mesaConfig.preco) ?? 0

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

    // INSERT
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
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content: utms.utm_content,
        utm_term: utms.utm_term,
        fbclid: utms.fbclid,
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
    })
  } catch (err) {
    console.error('[api/ticto-webhook]', err)
    return respond(500, { error: err.message }, err.message)
  }
}
