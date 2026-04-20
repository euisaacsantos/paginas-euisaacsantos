// Garante que _fbp existe como cookie server-side (Set-Cookie HTTP header).
// Cookies server-side não são bloqueados pelo Safari ITP — ao contrário dos
// gerados via document.cookie pelo pixel. Se o cookie já existir, devolve sem
// fazer nada para não sobrescrever um valor já em uso pelo pixel.
export default function handler(req, res) {
  const existing = req.cookies?.['_fbp']
  if (existing) {
    return res.status(204).end()
  }

  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1e10)
  const fbp = `fb.1.${ts}.${rand}`

  res.setHeader('Set-Cookie', `_fbp=${fbp}; Max-Age=31536000; Path=/; SameSite=Lax`)
  res.status(204).end()
}
