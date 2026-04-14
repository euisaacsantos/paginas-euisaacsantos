import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import 'dotenv/config'

// Plugin custom: em dev, carrega as handlers da pasta /api
// e responde em /api/<nome>. Em produção, quem serve isso é a Vercel.
function vercelApiDev() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        try {
          const pathname = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '')
          const modPath = new URL(`./api/${pathname}.js`, import.meta.url).pathname
          const mod = await server.ssrLoadModule(modPath)
          const handler = mod.default
          if (typeof handler !== 'function') {
            res.statusCode = 404
            return res.end(JSON.stringify({ error: 'handler não encontrado' }))
          }

          // Parse query string
          const url = new URL(req.url, `http://${req.headers.host}`)
          req.query = Object.fromEntries(url.searchParams)

          // Parse body (JSON)
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks = []
            for await (const c of req) chunks.push(c)
            const raw = Buffer.concat(chunks).toString('utf8')
            try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = raw }
          }

          // Adaptar res tipo Vercel (.status().json())
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }

          await handler(req, res)
        } catch (err) {
          console.error('[vercel-api-dev]', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), vercelApiDev()],
})
