import { next } from '@vercel/edge'

// Grava _fbp via Set-Cookie HTTP header no mesmo response que serve o HTML.
// Elimina o race condition do fetch('/api/fp'): o cookie já existe antes de
// qualquer script da página executar, incluindo o pixel do Meta.
// Safari trata cookies server-set como first-party — não bloqueia via ITP.
export default function middleware(request) {
  const existing = request.cookies.get('_fbp')
  if (existing) return next()

  const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`
  const response = next()
  response.headers.append(
    'Set-Cookie',
    `_fbp=${fbp}; Max-Age=31536000; Path=/; SameSite=Lax`
  )
  return response
}

export const config = {
  // Aplica apenas em rotas HTML — ignora api/, assets e arquivos estáticos
  matcher: ['/((?!api/|assets/|.*\\.(?:js|css|woff2?|ttf|webp|png|svg|ico|json)$).*)'],
}
