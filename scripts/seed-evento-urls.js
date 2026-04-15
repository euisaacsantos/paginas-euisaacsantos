import 'dotenv/config'
import Redis from 'ioredis'

// Cria as keys evento:zoom_url e mentoria:checkout_url no Redis com placeholders.
// Não sobrescreve se já existirem (preserva edição manual).

const PLACEHOLDERS = {
  'evento:zoom_url':       'https://zoom.us/j/PREENCHA_AQUI',
  'mentoria:checkout_url': 'https://checkout.ticto.app/PREENCHA_AQUI',
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

  for (const [key, value] of Object.entries(PLACEHOLDERS)) {
    const exists = await r.exists(key)
    if (exists) {
      const current = await r.get(key)
      console.log(`· ${key} já existe → preservado (${current})`)
    } else {
      await r.set(key, value)
      console.log(`✓ ${key} criado com placeholder → ${value}`)
    }
  }

  console.log('\n✓ seed evento URLs completo.')
  r.disconnect()
}

main().catch((err) => {
  console.error('✗ falhou:', err)
  process.exit(1)
})
