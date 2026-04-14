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

function extractOfferCode(body) {
  return (
    pick(body, [
      'offer_code',
      'offer.code',
      'product.offer_code',
      'transaction.offer_code',
      'items.0.offer.code',
      'items.0.offer_code',
    ]) ||
    (body.checkout_url && String(body.checkout_url).split('/').pop()) ||
    null
  )
}

function extractTransactionId(body) {
  return pick(body, [
    'transaction.hash',
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
    utm_source: pick(body, ['utm.source', 'utm_source', 'tracking.utm_source']),
    utm_medium: pick(body, ['utm.medium', 'utm_medium', 'tracking.utm_medium']),
    utm_campaign: pick(body, ['utm.campaign', 'utm_campaign', 'tracking.utm_campaign']),
    utm_content: pick(body, ['utm.content', 'utm_content', 'tracking.utm_content']),
    utm_term: pick(body, ['utm.term', 'utm_term', 'tracking.utm_term']),
    fbclid: pick(body, ['fbclid', 'tracking.fbclid', 'utm.fbclid']),
  }
}

function extractValor(body, offerCode) {
  const raw = pick(body, [
    'amount',
    'value',
    'price',
    'total',
    'transaction.amount',
    'order.total',
    'items.0.price',
  ])
  if (raw === null) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  // Ticto às vezes manda em centavos; heurística: se > 10x o esperado do Lote 0, divide por 100
  return n > 10000 ? n / 100 : n
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = req.query.token
  if (!process.env.TICTO_WEBHOOK_SECRET || token !== process.env.TICTO_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    const status = (body.status || body.order_status || body.transaction?.status || '')
      .toString()
      .toLowerCase()
    const validStatuses = ['approved', 'paid', 'authorized', 'aprovado', 'pago']
    if (status && !validStatuses.includes(status)) {
      return res.status(200).json({ ignored: true, reason: `status=${status}` })
    }

    const offerCode = extractOfferCode(body)
    if (!offerCode) {
      return res.status(400).json({ error: 'offer_code ausente no payload', body })
    }

    const transactionId = extractTransactionId(body)
    if (!transactionId) {
      return res.status(400).json({ error: 'transaction id ausente no payload', body })
    }

    const r = getRedis()
    const [imersaoConfigStr, mesaConfigStr] = await Promise.all([
      r.get('imersao:config'),
      r.get('mesa:config'),
    ])
    const lotes = JSON.parse(imersaoConfigStr || '[]')
    const mesaConfig = JSON.parse(mesaConfigStr || '{}')

    // Classifica produto pelo offer_code
    const loteMatch = lotes.find((l) => l.offer_code === offerCode)
    let produtoTipo
    let loteId = null
    let incrementoRedis = null

    if (loteMatch) {
      produtoTipo = 'imersao'
      loteId = loteMatch.id
      incrementoRedis = 'imersao:vendas'
    } else if (mesaConfig.offer_code && mesaConfig.offer_code === offerCode) {
      produtoTipo = 'mesa'
      incrementoRedis = 'mesa:vendas'
    } else {
      // offer_code desconhecido — provavelmente é order bump ou produto não mapeado
      produtoTipo = 'order_bump'
      // não incrementa contador Redis (contadores são só pra lote/mesa)
    }

    const customer = extractCustomer(body)
    const utms = extractUtms(body)
    const valor = extractValor(body, offerCode) ?? (loteMatch ? loteMatch.preco : mesaConfig.preco) ?? 0

    const supabase = getSupabase()

    // 1. Checa duplicata explicitamente
    const { data: existing, error: selectError } = await supabase
      .from('cct_vendas')
      .select('id')
      .eq('ticto_transaction_id', String(transactionId))
      .maybeSingle()

    if (selectError) {
      console.error('[ticto-webhook] erro SELECT Supabase:', selectError)
    }

    if (existing) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        transaction_id: transactionId,
        message: 'transação já registrada, ignorando',
      })
    }

    // 2. INSERT (transação nova)
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
      console.error('[ticto-webhook] erro INSERT Supabase:', insertError)
      return res.status(500).json({ error: 'supabase insert failed', details: insertError.message })
    }

    // 3. Redis — incrementa apenas quando insert foi bem sucedido (transação NOVA)
    let vendasRedis = null
    if (incrementoRedis) {
      vendasRedis = await r.incr(incrementoRedis)
    }

    return res.status(200).json({
      ok: true,
      kind: produtoTipo,
      lote: loteId,
      transaction_id: transactionId,
      supabase_saved: true,
      redis_vendas: vendasRedis,
    })
  } catch (err) {
    console.error('[api/ticto-webhook]', err)
    res.status(500).json({ error: err.message })
  }
}
