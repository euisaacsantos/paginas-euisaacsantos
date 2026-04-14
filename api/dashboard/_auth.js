// Valida ?token=<ADMIN_SECRET>. Retorna true se OK, senão manda 401 e retorna false.
export function requireAdmin(req, res) {
  const token = req.query?.token
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}
