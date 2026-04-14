import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const METAS = [
  { chave: 'ingressos_meta_total', valor: 335 },
  { chave: 'faturamento_ingresso_meta', valor: 6865 },
  { chave: 'order_bump_pct_meta', valor: 30 },
  { chave: 'order_bump_faturamento_meta', valor: 4723.5 },
  { chave: 'mesa_vendas_meta', valor: 15 },
  { chave: 'mesa_faturamento_meta', valor: 5955 },
  { chave: 'investimento_meta_ads', valor: 17000 },
  { chave: 'faturamento_imersao_meta', valor: 17543.5 },
  { chave: 'cpa_alvo', valor: 50.75 },
  { chave: 'presenca_pct_meta', valor: 65 },
  { chave: 'perda_pitch_pct_meta', valor: 20 },
  { chave: 'conversao_pitch_pct_meta', valor: 15 },
  { chave: 'mentoria_vendas_meta', valor: 26 },
  { chave: 'mentoria_preco', valor: 1600 },
  { chave: 'mentoria_faturamento_meta', valor: 41808 },
  { chave: 'faturamento_total_meta', valor: 44413 },
  { chave: 'roas_meta', valor: 2.61 },
]

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) {
    console.error('✗ SUPABASE_URL ou SUPABASE_SERVICE_ROLE ausentes no .env')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('→ populando cct_metas...')
  let ok = 0
  let fail = 0
  for (const m of METAS) {
    const { error } = await supabase
      .from('cct_metas')
      .upsert(
        { chave: m.chave, valor: m.valor, updated_at: new Date().toISOString() },
        { onConflict: 'chave' }
      )
    if (error) {
      console.error(`✗ ${m.chave}: ${error.message}`)
      fail += 1
    } else {
      console.log(`✓ ${m.chave} = ${m.valor}`)
      ok += 1
    }
  }
  console.log(`\n${ok} ok, ${fail} falhas de ${METAS.length} metas.`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('✗ falhou:', err)
  process.exit(1)
})
