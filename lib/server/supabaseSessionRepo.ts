import type { SupabaseClient } from '@supabase/supabase-js'
import { gerarRefCurta } from './refCurta'
import type { FiltroListagem, NovaSessao, SessionRepo } from './sessionRepo'
import type { QuizSession } from './types'

const paraSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const paraCamel = (k: string) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const mapChaves = (o: Record<string, unknown>, f: (k: string) => string) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), v]))
export const deLinha = (l: Record<string, unknown>) => mapChaves(l, paraCamel) as unknown as QuizSession
const paraLinha = (p: Partial<QuizSession>) => mapChaves(p as Record<string, unknown>, paraSnake)

const TABELA = 'quiz_sessions'
const COLISAO = '23505' // unique_violation

export function criarSupabaseSessionRepo(db: SupabaseClient): SessionRepo {
  const um = async (q: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>) => {
    const { data, error } = await q
    if (error) throw Object.assign(new Error(error.message), { code: error.code })
    return data ? deLinha(data as Record<string, unknown>) : null
  }

  return {
    async criar(nova: NovaSessao) {
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        try {
          const s = await um(db.from(TABELA).insert(paraLinha({ hoje: nova.hoje, refCurta: gerarRefCurta(), ...nova.utm })).select().single())
          return s as QuizSession
        } catch (e) {
          if ((e as { code?: string }).code !== COLISAO) throw e
        }
      }
      throw new Error('não consegui gerar ref_curta única')
    },
    buscarPorToken: (t) => um(db.from(TABELA).select().eq('session_token', t).maybeSingle()),
    buscarPorDiagnosticoToken: (t) => um(db.from(TABELA).select().eq('diagnostico_token', t).maybeSingle()),
    buscarPorRef: (r) => um(db.from(TABELA).select().eq('ref_curta', r).maybeSingle()),
    salvarSnapshot: (id, patch) =>
      um(db.from(TABELA).update(paraLinha(patch)).eq('id', id).neq('status', 'concluido').lt('seq', patch.seq).select().maybeSingle()),
    concluir: (id, patch) =>
      um(db.from(TABELA).update(paraLinha({ ...patch, status: 'concluido' })).eq('id', id).neq('status', 'concluido').select().maybeSingle()),
    async atualizar(id, patch) {
      return (await um(db.from(TABELA).update(paraLinha(patch)).eq('id', id).select().single())) as QuizSession
    },
    async listar(f: FiltroListagem) {
      let q = db.from(TABELA).select('*', { count: 'exact' })
      if (f.tipo) q = q.eq('tipo', f.tipo)
      if (f.exame) q = q.eq('exame', f.exame)
      if (f.status) q = q.eq('status', f.status)
      if (f.busca) {
        const b = f.busca.replace(/[%,()*"\\]/g, ' ').trim()
        const digitos = f.busca.replace(/\D/g, '')
        const extra = digitos.length >= 4 ? `,whatsapp_normalizado.ilike.%${digitos}%` : ''
        q = q.or(`ref_curta.ilike.%${b}%,nome.ilike.%${b}%,nome_completo.ilike.%${b}%,email.ilike.%${b}%,whatsapp.ilike.%${b}%${extra}`)
      }
      const ini = (f.pagina - 1) * f.porPagina
      const { data, error, count } = await q.order('started_at', { ascending: false }).order('id', { ascending: false }).range(ini, ini + f.porPagina - 1)
      if (error) throw new Error(error.message)
      return { sessoes: (data ?? []).map((l) => deLinha(l)), total: count ?? 0 }
    },
    async outrasTentativas(s) {
      const filtros = [
        s.emailNormalizado ? `email_normalizado.eq.${s.emailNormalizado}` : null,
        s.whatsappNormalizado ? `whatsapp_normalizado.eq.${s.whatsappNormalizado}` : null,
      ].filter(Boolean)
      if (!filtros.length) return []
      const { data, error } = await db.from(TABELA).select().neq('id', s.id).or(filtros.join(',')).order('id', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((l) => deLinha(l))
    },
  }
}
