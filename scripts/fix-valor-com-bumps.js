/**
 * Corrige o valor das rows de imersão/mesa que foram salvas com paid_amount total
 * (incluindo order bumps). Subtrai o total dos bumps para obter só o produto principal.
 *
 * Rodar uma vez: node --env-file=.env scripts/fix-valor-com-bumps.js
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function main() {
  console.log('→ Buscando payloads com bumps em cct_webhook_raw…')

  let page = 0
  const PAGE = 500
  let fixed = 0, skipped = 0

  while (true) {
    const { data: rows, error } = await supabase
      .from('cct_webhook_raw')
      .select('id, body, received_at')
      .eq('endpoint', 'ticto-webhook')
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .order('received_at', { ascending: true })

    if (error) { console.error('Erro ao buscar raw:', error.message); break }
    if (!rows || rows.length === 0) break

    const withBumps = rows.filter(r =>
      Array.isArray(r.body?.bumps) && r.body.bumps.length > 0
    )

    for (const raw of withBumps) {
      const body = raw.body

      const status = (body.status || body.order_status || body.transaction?.status || '').toLowerCase()
      if (!['approved', 'paid', 'authorized', 'aprovado', 'pago'].includes(status)) continue

      // Extrai paid_amount (centavos → reais)
      let paidAmount = null
      if (body.order?.paid_amount != null) {
        paidAmount = Number(body.order.paid_amount)
        if (Number.isFinite(paidAmount)) paidAmount = paidAmount / 100
      }
      if (paidAmount === null) continue

      // Total dos bumps
      const bumpTotal = body.bumps.reduce((sum, b) => sum + (parseFloat(b.offer_price) || 0), 0)
      const valorCorreto = Math.max(0, Math.round((paidAmount - bumpTotal) * 100) / 100)

      // Localiza a row principal (imersao ou mesa) — não a _bump_
      const txId = extractTransactionId(body)
      if (!txId) continue

      const { data: venda, error: fetchErr } = await supabase
        .from('cct_vendas')
        .select('id, valor, produto_tipo')
        .eq('ticto_transaction_id', String(txId))
        .neq('produto_tipo', 'order_bump')
        .maybeSingle()

      if (fetchErr) { console.error(`  ✗ fetch ${txId}:`, fetchErr.message); continue }
      if (!venda) { skipped++; continue }

      const valorAtual = Number(venda.valor)
      if (Math.abs(valorAtual - valorCorreto) < 0.01) { skipped++; continue }

      const { error: updateErr } = await supabase
        .from('cct_vendas')
        .update({ valor: valorCorreto })
        .eq('id', venda.id)

      if (updateErr) {
        console.error(`  ✗ update ${txId}:`, updateErr.message)
      } else {
        fixed++
        console.log(`  ✓ ${txId} (${venda.produto_tipo}): R$${valorAtual} → R$${valorCorreto} (bumps: R$${bumpTotal})`)
      }
    }

    if (rows.length < PAGE) break
    page++
  }

  console.log(`\n✓ Concluído. Corrigidos: ${fixed} | Sem diferença/não encontrados: ${skipped}`)
}

function extractTransactionId(body) {
  const paths = [
    'transaction.hash', 'order.transaction_hash', 'transaction.id',
    'order.hash', 'order.id', 'order_id', 'hash', 'id',
  ]
  for (const p of paths) {
    const v = p.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), body)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

main().catch((e) => { console.error('✗ Falhou:', e.message); process.exit(1) })
