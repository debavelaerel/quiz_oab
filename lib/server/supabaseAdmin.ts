import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

export function criarSupabaseAdmin(): SupabaseClient {
  if (cliente) return cliente
  const url = process.env.SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chave) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
  return cliente
}
