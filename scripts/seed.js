import 'dotenv/config'
import Redis from 'ioredis'

const LOTES = [
  { id: 0, nome: 'Lote 0',   preco:  9, vagas_max: 100, checkout: 'https://checkout.ticto.app/OF2C85B97', offer_code: 'OF2C85B97' },
  { id: 1, nome: '1° Lote',  preco: 15, vagas_max:  75, checkout: 'https://checkout.ticto.app/OE6189E11', offer_code: 'OE6189E11' },
  { id: 2, nome: '2° Lote',  preco: 19, vagas_max:  60, checkout: 'https://checkout.ticto.app/O7C22AADF', offer_code: 'O7C22AADF' },
  { id: 3, nome: '3° Lote',  preco: 27, vagas_max:  50, checkout: 'https://checkout.ticto.app/OAC031B04', offer_code: 'OAC031B04' },
  { id: 4, nome: '4° Lote',  preco: 37, vagas_max:  50, checkout: 'https://checkout.ticto.app/O0B9F3ECB', offer_code: 'O0B9F3ECB' },
  { id: 5, nome: '5° Lote',  preco: 47, vagas_max:  50, checkout: 'https://checkout.ticto.app/O7CE6EC04', offer_code: 'O7CE6EC04' },
]

const MESA = {
  total: 15,
  preco: 497,
  checkout: 'https://checkout.ticto.app/OE7DEE344',
  offer_code: 'OE7DEE344',
}

async function main() {
  if (!process.env.REDIS_URL) {
    console.error('✗ REDIS_URL ausente no .env')
    process.exit(1)
  }

  const r = new Redis(process.env.REDIS_URL)

  console.log('→ conectando no Redis…')
  await r.ping()
  console.log('✓ conectado')

  await r.set('imersao:config', JSON.stringify(LOTES))
  console.log('✓ imersao:config gravado')

  await r.set('mesa:config', JSON.stringify(MESA))
  console.log('✓ mesa:config gravado')

  const vendasExiste = await r.exists('imersao:vendas')
  if (!vendasExiste) {
    await r.set('imersao:vendas', 0)
    console.log('✓ imersao:vendas inicializado em 0')
  } else {
    const v = await r.get('imersao:vendas')
    console.log(`· imersao:vendas já existe (${v}) — preservado`)
  }

  const mesaVendasExiste = await r.exists('mesa:vendas')
  if (!mesaVendasExiste) {
    await r.set('mesa:vendas', 0)
    console.log('✓ mesa:vendas inicializado em 0')
  } else {
    const v = await r.get('mesa:vendas')
    console.log(`· mesa:vendas já existe (${v}) — preservado`)
  }

  console.log('\n✓ seed completo.')
  r.disconnect()
}

main().catch((err) => {
  console.error('✗ falhou:', err)
  process.exit(1)
})
