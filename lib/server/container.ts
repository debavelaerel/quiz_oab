import { criarSupabaseAdmin } from './supabaseAdmin'
import { criarSupabaseSessionRepo } from './supabaseSessionRepo'
import type { SessionRepo } from './sessionRepo'

let repo: SessionRepo | null = null
export const obterRepo = (): SessionRepo => (repo ??= criarSupabaseSessionRepo(criarSupabaseAdmin()))
export const permitirHojeOverride = () => process.env.ALLOW_HOJE_OVERRIDE === '1'
