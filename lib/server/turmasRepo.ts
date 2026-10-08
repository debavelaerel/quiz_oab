import type { SupabaseClient } from '@supabase/supabase-js'
import { aplicarEdicoes, TURMAS_PADRAO, validarEdicoes, type EdicaoTurma, type Turma } from '@/lib/oab/turmas'

const CHAVE = 'turmas'
const CACHE_MS = 60_000

export interface TurmasRepo {
  /** Edições gravadas pelo admin, ou null se nunca houve (vale o data.json). */
  ler(): Promise<{ edicoes: EdicaoTurma[]; atualizadoEm: string } | null>
  salvar(edicoes: EdicaoTurma[]): Promise<void>
  /** Volta às datas do data.json. */
  restaurar(): Promise<void>
}

export function criarSupabaseTurmasRepo(db: SupabaseClient): TurmasRepo {
  return {
    async ler() {
      const { data, error } = await db.from('quiz_oab_config').select('valor, atualizado_em').eq('chave', CHAVE).maybeSingle()
      if (error) throw new Error(`ler turmas: ${error.message}`)
      return data ? { edicoes: data.valor as EdicaoTurma[], atualizadoEm: data.atualizado_em as string } : null
    },
    async salvar(edicoes) {
      const { error } = await db.from('quiz_oab_config').upsert({ chave: CHAVE, valor: edicoes, atualizado_em: new Date().toISOString() })
      if (error) throw new Error(`salvar turmas: ${error.message}`)
    },
    async restaurar() {
      const { error } = await db.from('quiz_oab_config').delete().eq('chave', CHAVE)
      if (error) throw new Error(`restaurar turmas: ${error.message}`)
    },
  }
}

export type TurmasAtuais = { turmas: Turma[]; edicoes: EdicaoTurma[]; atualizadoEm: string | null }

const padrao = (): TurmasAtuais => ({ turmas: TURMAS_PADRAO, edicoes: TURMAS_PADRAO.map((t) => ({ ...t })), atualizadoEm: null })

/** As turmas em vigor: do banco (cache de 1 min) ou, se não há nada gravado ou o banco falhou, as do data.json. */
export function criarServicoTurmas(repo: TurmasRepo, agora: () => number = Date.now) {
  let cache: { em: number; valor: TurmasAtuais } | null = null
  return {
    /** `fresco`: ignora o cache (a tela do admin sempre mostra o que está gravado). */
    async atuais(opcoes: { fresco?: boolean } = {}): Promise<TurmasAtuais> {
      if (!opcoes.fresco && cache && agora() - cache.em < CACHE_MS) return cache.valor
      let valor: TurmasAtuais
      try {
        const lido = await repo.ler()
        const v = lido && validarEdicoes(lido.edicoes)
        valor = lido && v && v.ok
          ? { turmas: aplicarEdicoes(v.edicoes), edicoes: v.edicoes, atualizadoEm: lido.atualizadoEm }
          : padrao()
      } catch (e) {
        console.error('[turmas] banco indisponível, usando o data.json', String(e))
        valor = padrao()
      }
      cache = { em: agora(), valor }
      return valor
    },
    async salvar(edicoes: EdicaoTurma[]) { await repo.salvar(edicoes); cache = null },
    async restaurar() { await repo.restaurar(); cache = null },
  }
}
