import { createClient } from '@supabase/supabase-js'

let client

export function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE
    if (!url || !key) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE ausentes')
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
