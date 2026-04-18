import { getRedis } from '../_redis.js'
import { getSupabase } from '../_supabase.js'
import { requireAdmin } from './_auth.js'

// GET /api/dashboard/overview?token=X
// Retorna KPIs agregados (Redis + Supabase).
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  try {
    const r = getRedis()
    const supabase = getSupabase()

    const [imersaoConfigStr, mesaConfigStr, vendasImersaoStr, vendasMesaStr] =
      await Promise.all([
        r.get('imersao:config'),
        r.get('mesa:config'),
        r.get('imersao:vendas'),
        r.get('mesa:vendas'),
      ])

    const lotes = JSON.parse(imersaoConfigStr || '[]')
    const mesaConfig = JSON.parse(mesaConfigStr || '{}')
    const vendasImersaoRedis = parseInt(vendasImersaoStr || '0', 10)
    const vendasMesaRedis = parseInt(vendasMesaStr || '0', 10)

    // Lote atual
    let acumulado = 0
    let loteAtual = lotes[lotes.length - 1] || null
    let vendasNoLote = 0
    for (const lote of lotes) {
      const end = acumulado + lote.vagas_max
      if (vendasImersaoRedis < end) {
        loteAtual = lote
        vendasNoLote = vendasImersaoRedis - acumulado
        break
      }
      acumulado = end
    }
    const pctLote = loteAtual
      ? Math.min(100, Math.round((vendasNoLote / loteAtual.vagas_max) * 100))
      : 0

    // KPIs do Supabase (cct_vendas)
    // raw_payload.payment_method vem direto da Ticto ('pix' | 'credit_card' | etc)
    const { data: vendasRows, error: vendasErr } = await supabase
      .from('cct_vendas')
      .select('ticto_transaction_id, produto_tipo, lote_id, valor, meta_capi_sent, status, raw_payload')

    if (vendasErr) throw vendasErr

    const kpis = {
      vendas_imersao: 0,
      vendas_order_bump: 0,
      vendas_mesa: 0,
      faturamento_total: 0,
      comissao_total: 0,
      faturamento_por_produto: { imersao: 0, order_bump: 0, mesa: 0 },
      ticket_medio: 0,
      capi_sucesso_pct: 0,
    }

    let capiOk = 0
    let capiTotal = 0
    const vendas = vendasRows || []

    // Contagem de vendas por lote_id (imersão)
    const vendasPorLote = {}

    // PIX vs Cartão: inferido pelo cruzamento com leads_pendentes
    const pagamento = { pix: 0, cartao: 0 }

    for (const v of vendas) {
      const valor = Number(v.valor) || 0
      kpis.faturamento_total += valor

      // Comissão líquida: soma owner_commissions[].commission_amount (centavos)
      const commissions = v.raw_payload?.owner_commissions
      if (Array.isArray(commissions)) {
        for (const c of commissions) {
          kpis.comissao_total += (Number(c.commission_amount) || 0) / 100
        }
      }

      if (v.produto_tipo === 'imersao') {
        kpis.vendas_imersao += 1
        kpis.faturamento_por_produto.imersao += valor
        const lid = v.lote_id != null ? String(v.lote_id) : 'sem_lote'
        vendasPorLote[lid] = (vendasPorLote[lid] || 0) + 1
      } else if (v.produto_tipo === 'mesa') {
        kpis.vendas_mesa += 1
        kpis.faturamento_por_produto.mesa += valor
      } else {
        kpis.vendas_order_bump += 1
        kpis.faturamento_por_produto.order_bump += valor
      }

      // Método de pagamento direto do payload (order_bumps são bundled, não contar separado)
      if (v.produto_tipo !== 'order_bump') {
        const pm = v.raw_payload?.payment_method || ''
        if (pm === 'pix') pagamento.pix += 1
        else pagamento.cartao += 1
      }

      // CAPI: conta só imersao e mesa — order_bump não dispara evento
      if (v.produto_tipo !== 'order_bump') {
        capiTotal += 1
        if (v.meta_capi_sent === true) capiOk += 1
      }
    }

    const totalVendas =
      kpis.vendas_imersao + kpis.vendas_order_bump + kpis.vendas_mesa
    kpis.ticket_medio =
      totalVendas > 0
        ? Math.round((kpis.faturamento_total / totalVendas) * 100) / 100
        : 0
    kpis.faturamento_total = Math.round(kpis.faturamento_total * 100) / 100
    kpis.comissao_total    = Math.round(kpis.comissao_total    * 100) / 100
    kpis.faturamento_por_produto.imersao =
      Math.round(kpis.faturamento_por_produto.imersao * 100) / 100
    kpis.faturamento_por_produto.order_bump =
      Math.round(kpis.faturamento_por_produto.order_bump * 100) / 100
    kpis.faturamento_por_produto.mesa =
      Math.round(kpis.faturamento_por_produto.mesa * 100) / 100
    kpis.capi_sucesso_pct =
      capiTotal > 0 ? Math.round((capiOk / capiTotal) * 100) : 0

    // Breakdown por lote com % e vendas absolutas
    const lotes_breakdown = lotes.map((l) => {
      const vendidas = vendasPorLote[String(l.id)] || 0
      return {
        id: l.id,
        nome: l.nome,
        preco: l.preco,
        vagas_max: l.vagas_max,
        vendidas,
        pct: l.vagas_max > 0 ? Math.round((vendidas / l.vagas_max) * 100) : 0,
        encerrado: vendidas >= l.vagas_max,
      }
    })

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      lote_atual: loteAtual
        ? {
            id: loteAtual.id,
            nome: loteAtual.nome,
            preco: loteAtual.preco,
            vagas_max: loteAtual.vagas_max,
            vendas_no_lote: vendasNoLote,
            pct_vendido: pctLote,
          }
        : null,
      lotes_breakdown,
      kpis,
      contadores_redis: {
        imersao: vendasImersaoRedis,
        mesa: vendasMesaRedis,
      },
      mesa_config: {
        total: mesaConfig.total || 15,
        preco: mesaConfig.preco || 497,
        restantes: Math.max(0, (mesaConfig.total || 15) - vendasMesaRedis),
      },
      pagamento,
      atualizado_em: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/dashboard/overview]', err)
    res.status(500).json({ error: err.message })
  }
}
