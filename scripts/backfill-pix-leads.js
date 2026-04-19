/**
 * Reprocessa PIX leads que foram ignorados porque pix_created não estava na lista.
 * Busca cct_webhook_raw onde response_body contém "status=pix_created" (ignorados),
 * extrai o payload e insere em cct_leads_pendentes.
 *
 * Rodar uma vez: node --env-file=.env scripts/backfill-pix-leads.js
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { Redis } from 'ioredis'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const redis = new Redis(process.env.REDIS_URL)

// ── helpers (mirror do webhook) ──────────────────────────────────────────────
function pick(obj, paths) {
  for (const p of paths) {
    const v = p.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}
function extractOfferCode(body) {
  return pick(body, [
    'item.offer_code', 'item.offer.code', 'items.0.offer_code',
    'offer.code', 'offer_code', 'product.offer_code', 'transaction.offer_code',
  ]) || null
}
function extractTransactionId(body) {
  return pick(body, [
    'transaction.hash', 'order.transaction_hash', 'transaction.id',
    'order.hash', 'order.id', 'order_id', 'hash', 'id',
  ])
}
function extractCustomer(body) {
  return {
    email: pick(body, ['customer.email', 'email', 'buyer.email']),
    telefone: pick(body, ['customer.phone.number', 'customer.phone', 'phone']),
    nome: pick(body, ['customer.name', 'customer.full_name', 'name']),
  }
}
function normalizeUtm(v) {
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  if (['não informado', 'nao informado', 'none', 'null', 'undefined', 'n/a'].includes(s)) return null
  return String(v).trim()
}
function extractUtms(body) {
  return {
    utm_source:   normalizeUtm(pick(body, ['tracking.utm_source', 'utm_source'])),
    utm_medium:   normalizeUtm(pick(body, ['tracking.utm_medium', 'utm_medium'])),
    utm_campaign: normalizeUtm(pick(body, ['tracking.utm_campaign', 'utm_campaign'])),
    utm_content:  normalizeUtm(pick(body, ['tracking.utm_content', 'utm_content'])),
    utm_term:     normalizeUtm(pick(body, ['tracking.utm_term', 'utm_term'])),
    fbclid:       normalizeUtm(pick(body, ['tracking.fbclid', 'fbclid'])),
  }
}
function extractValor(body) {
  if (body.order?.paid_amount != null) {
    const n = Number(body.order.paid_amount)
    if (Number.isFinite(n)) return n / 100
  }
  const raw = pick(body, ['amount', 'value', 'price', 'total', 'item.price'])
  if (raw === null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? (n >= 10000 ? n / 100 : n) : null
}
function extractCpf(body) {
  return pick(body, ['customer.cpf', 'customer.document', 'buyer.cpf'])
}
function extractSrcSessionId(body) {
  const src = pick(body, ['tracking.src', 'src'])
  if (!src) return null
  const s = String(src)
  return s.startsWith('sess_') ? s.slice(5) : null
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Busca todos os webhooks ignorados por pix_created
  const { data: rows, error } = await supabase
    .from('cct_webhook_raw')
    .select('id, body, received_at')
    .eq('response_body->>reason', 'status=pix_created')
    .order('received_at', { ascending: true })

  if (error) throw new Error('Erro buscando cct_webhook_raw: ' + error.message)
  console.log(`Encontrados ${rows.length} webhooks pix_created ignorados\n`)

  // Config Redis
  const [imersaoStr, mesaStr] = await Promise.all([
    redis.get('imersao:config'),
    redis.get('mesa:config'),
  ])
  const lotes = JSON.parse(imersaoStr || '[]')
  const mesaConfig = JSON.parse(mesaStr || '{}')

  let inseridos = 0
  let pulados = 0

  for (const row of rows) {
    const body = row.body
    const offerCode = extractOfferCode(body)
    const transactionId = extractTransactionId(body)
    const customer = extractCustomer(body)

    if (!offerCode || !transactionId) {
      console.log(`  [skip] raw id=${row.id} — falta offerCode ou transactionId`)
      pulados++
      continue
    }

    // Verifica se já existe compra aprovada — por transaction_id OU por email+offer_code
    const [{ data: vendaPorTx }, { data: vendaPorEmail }] = await Promise.all([
      supabase.from('cct_vendas').select('id').eq('ticto_transaction_id', String(transactionId)).maybeSingle(),
      customer.email && offerCode
        ? supabase.from('cct_vendas').select('id').eq('email', customer.email).eq('offer_code', offerCode).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (vendaPorTx || vendaPorEmail) {
      console.log(`  [skip] transaction=${transactionId} — já virou compra aprovada`)
      pulados++
      continue
    }

    // Verifica se já está em leads_pendentes
    const { data: leadExiste } = await supabase
      .from('cct_leads_pendentes')
      .select('id')
      .eq('ticto_transaction_id', String(transactionId))
      .maybeSingle()

    if (leadExiste) {
      console.log(`  [skip] transaction=${transactionId} — já está em leads_pendentes`)
      pulados++
      continue
    }

    const loteMatch = lotes.find((l) => l.offer_code === offerCode)
    let produtoTipo, loteId = null
    if (loteMatch) { produtoTipo = 'imersao'; loteId = loteMatch.id }
    else if (mesaConfig.offer_code === offerCode) { produtoTipo = 'mesa' }
    else { produtoTipo = 'order_bump' }

    const utms = extractUtms(body)
    const valor = extractValor(body) ?? (loteMatch ? loteMatch.preco : mesaConfig.preco) ?? 0
    const cpf = extractCpf(body)
    const sessionId = extractSrcSessionId(body)

    const expiresAt = new Date(row.received_at)
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)

    const { error: insertError } = await supabase
      .from('cct_leads_pendentes')
      .insert({
        kind: 'pix_generated',
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
      })

    if (insertError) {
      console.error(`  [erro] transaction=${transactionId}:`, insertError.message)
    } else {
      console.log(`  [ok] ${customer.email} — ${customer.nome} — R$${valor} — ${row.received_at}`)
      inseridos++
    }
  }

  console.log(`\nPronto: ${inseridos} inseridos, ${pulados} pulados`)
  redis.disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
