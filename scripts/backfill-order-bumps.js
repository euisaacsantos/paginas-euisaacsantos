/**
 * Retroativamente insere order bumps que chegaram em body.bumps[]
 * mas foram ignorados antes do fix no ticto-webhook.js.
 *
 * Lê cct_webhook_raw, filtra payloads com bumps aprovados,
 * e insere em cct_vendas apenas os que ainda não existem.
 *
 * Rodar uma vez: node --env-file=.env scripts/backfill-order-bumps.js
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const PURCHASE_STATUSES = ['approved', 'paid', 'authorized', 'aprovado', 'pago']

function pick(obj, paths) {
  for (const p of paths) {
    const v = p.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

function extractTransactionId(body) {
  return pick(body, [
    'transaction.hash', 'order.transaction_hash', 'transaction.id',
    'order.hash', 'order.id', 'order_id', 'hash', 'id',
  ])
}

function extractCustomer(body) {
  return {
    email:    pick(body, ['customer.email', 'email', 'buyer.email']),
    telefone: pick(body, ['customer.phone.number', 'customer.phone', 'phone', 'buyer.phone']),
    nome:     pick(body, ['customer.name', 'customer.full_name', 'name', 'buyer.name']),
  }
}

function extractUtms(body) {
  return {
    utm_source:   pick(body, ['tracking.utm_source',   'utm.source',   'utm_source']),
    utm_medium:   pick(body, ['tracking.utm_medium',   'utm.medium',   'utm_medium']),
    utm_campaign: pick(body, ['tracking.utm_campaign', 'utm.campaign', 'utm_campaign']),
    utm_content:  pick(body, ['tracking.utm_content',  'utm.content',  'utm_content']),
    utm_term:     pick(body, ['tracking.utm_term',     'utm.term',     'utm_term']),
  }
}

async function main() {
  console.log('→ Buscando payloads com bumps em cct_webhook_raw…')

  // Pagina em lotes de 1000 para não estourar memória
  let page = 0
  const PAGE = 1000
  let total = 0, inserted = 0, skipped = 0

  while (true) {
    const { data: rows, error } = await supabase
      .from('cct_webhook_raw')
      .select('id, body, received_at')
      .eq('endpoint', 'ticto-webhook')
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .order('received_at', { ascending: true })

    if (error) { console.error('Erro ao buscar raw:', error.message); break }
    if (!rows || rows.length === 0) break

    // Filtra em JS — filtro JSONB aninhado não funciona via PostgREST
    const withBumps = rows.filter(r => Array.isArray(r.body?.bumps) && r.body.bumps.length > 0)
    total += withBumps.length
    console.log(`  página ${page + 1}: ${rows.length} rows lidas | ${withBumps.length} com bumps`)

    for (const raw of withBumps) {
      const body = raw.body
      const status = (body.status || body.order_status || body.transaction?.status || '').toLowerCase()
      if (!PURCHASE_STATUSES.includes(status)) continue

      const transactionId = extractTransactionId(body)
      if (!transactionId) continue

      const bumps = Array.isArray(body.bumps) ? body.bumps : []
      const customer = extractCustomer(body)
      const utms = extractUtms(body)

      for (const bump of bumps) {
        const bumpCode = bump.offer_code || bump.offer?.code
        if (!bumpCode) continue

        const bumpTxId = `${transactionId}_bump_${bumpCode}`
        const bumpValor = parseFloat(bump.offer_price) || 0

        const { data: exists } = await supabase
          .from('cct_vendas')
          .select('id')
          .eq('ticto_transaction_id', bumpTxId)
          .maybeSingle()

        if (exists) { skipped++; continue }

        const { error: insertErr } = await supabase.from('cct_vendas').insert({
          ticto_transaction_id: bumpTxId,
          status:        status || 'approved',
          offer_code:    bumpCode,
          produto_tipo:  'order_bump',
          lote_id:       null,
          valor:         bumpValor,
          email:         customer.email,
          telefone:      customer.telefone,
          nome:          customer.nome,
          utm_source:    utms.utm_source   || null,
          utm_medium:    utms.utm_medium   || null,
          utm_campaign:  utms.utm_campaign || null,
          utm_content:   utms.utm_content  || null,
          utm_term:      utms.utm_term     || null,
          meta_capi_sent: false,
          raw_payload:   { bump, parent_transaction_id: String(transactionId), backfill: true },
        })

        if (insertErr) {
          console.error(`  ✗ erro ao inserir ${bumpTxId}:`, insertErr.message)
        } else {
          inserted++
          console.log(`  ✓ inserido: ${bumpTxId} — R$${bumpValor} (${bump.offer_name || bumpCode})`)
        }
      }
    }

    if (rows.length < PAGE) break
    page++
  }

  console.log(`\n✓ Concluído. Raw com bumps: ${total} | Inseridos: ${inserted} | Já existiam: ${skipped}`)
}

main().catch((e) => { console.error('✗ Falhou:', e.message); process.exit(1) })
