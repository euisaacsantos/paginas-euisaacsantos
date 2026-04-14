import { getRedis } from './_redis.js'

export default async function handler(req, res) {
  try {
    const r = getRedis()
    const [imersaoConfigStr, mesaConfigStr, vendasStr, mesaVendasStr] = await Promise.all([
      r.get('imersao:config'),
      r.get('mesa:config'),
      r.get('imersao:vendas'),
      r.get('mesa:vendas'),
    ])

    const lotes = JSON.parse(imersaoConfigStr || '[]')
    const mesaConfig = JSON.parse(mesaConfigStr || '{}')
    const vendas = parseInt(vendasStr || '0', 10)
    const mesaVendas = parseInt(mesaVendasStr || '0', 10)

    // lote atual: primeiro lote cujas vagas ainda não encheram
    let acumulado = 0
    let loteAtual = lotes[lotes.length - 1] || null
    let vendasNoLote = 0
    for (const lote of lotes) {
      const end = acumulado + lote.vagas_max
      if (vendas < end) {
        loteAtual = lote
        vendasNoLote = vendas - acumulado
        break
      }
      acumulado = end
    }
    if (!loteAtual) {
      return res.status(500).json({ error: 'config de lotes vazia — rode npm run seed' })
    }
    // fallback pro último lote se já vendeu tudo
    if (vendas >= acumulado + (loteAtual?.vagas_max || 0) && lotes.length) {
      const last = lotes[lotes.length - 1]
      vendasNoLote = Math.min(last.vagas_max, vendas - lotes.slice(0, -1).reduce((s, l) => s + l.vagas_max, 0))
      loteAtual = last
    }

    const pctLote = Math.min(100, Math.round((vendasNoLote / loteAtual.vagas_max) * 100))

    const mesaTotal = mesaConfig.total || 15
    const mesaRestantes = Math.max(0, mesaTotal - mesaVendas)
    const mesaPct = Math.min(100, Math.round((mesaVendas / mesaTotal) * 100))

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    res.status(200).json({
      imersao: {
        lote_atual: loteAtual,
        lotes,
        vendas_totais: vendas,
        vendas_no_lote: vendasNoLote,
        vagas_max_lote: loteAtual.vagas_max,
        pct_vendido: pctLote,
      },
      mesa: {
        vendas: mesaVendas,
        total: mesaTotal,
        restantes: mesaRestantes,
        pct_vendido: mesaPct,
        checkout: mesaConfig.checkout || '',
        offer_code: mesaConfig.offer_code || '',
        preco: mesaConfig.preco || 497,
      },
    })
  } catch (err) {
    console.error('[api/config]', err)
    res.status(500).json({ error: err.message })
  }
}
