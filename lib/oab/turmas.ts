// Datas das turmas editáveis pelo admin. A lista de turmas (exame + dias) e as horas por dia
// continuam vindo do data.json; o admin só troca as datas e os avisos de "a confirmar".
import data from './data.json'
import { make } from './logic'
import type { Logic, Turma } from './logic'

export type { Turma }

/** O que o admin pode editar em cada turma. */
export type EdicaoTurma = {
  exame: string
  dias: number
  vendasIni: string
  vendasFim: string
  inicio: string
  inicio2?: string
  aConfirmar?: boolean
  fimVendasAConfirmar?: boolean
}

export const TURMAS_PADRAO: Turma[] = data.turmas as Turma[]

const chave = (t: { exame: string; dias: number }) => `${t.exame}-${t.dias}`
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/
const dataValida = (s: unknown): s is string => {
  if (typeof s !== 'string' || !DATA_ISO.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** Mescla as edições sobre a lista padrão: só as turmas e os campos conhecidos entram. */
export function aplicarEdicoes(edicoes: readonly EdicaoTurma[], base: readonly Turma[] = TURMAS_PADRAO): Turma[] {
  const porChave = new Map(edicoes.map((e) => [chave(e), e]))
  return base.map((t) => {
    const e = porChave.get(chave(t))
    if (!e) return { ...t }
    const { inicio2: _antigo, aConfirmar: _a, fimVendasAConfirmar: _f, ...resto } = t
    void _antigo; void _a; void _f
    return {
      ...resto,
      vendasIni: e.vendasIni, vendasFim: e.vendasFim, inicio: e.inicio,
      ...(e.inicio2 ? { inicio2: e.inicio2 } : {}),
      ...(e.aConfirmar ? { aConfirmar: true } : {}),
      ...(e.fimVendasAConfirmar ? { fimVendasAConfirmar: true } : {}),
    }
  })
}

export type ErroTurma = { exame: string; dias: number; campo: string; mensagem: string }

/** Regras do formulário: datas reais, fim depois da abertura, início depois da abertura das vendas. */
export function validarEdicoes(edicoes: unknown, base: readonly Turma[] = TURMAS_PADRAO): { ok: true; edicoes: EdicaoTurma[] } | { ok: false; erros: ErroTurma[] } {
  if (!Array.isArray(edicoes)) return { ok: false, erros: [{ exame: '', dias: 0, campo: 'turmas', mensagem: 'lista de turmas inválida' }] }
  const erros: ErroTurma[] = []
  const vistos = new Set<string>()
  const limpas: EdicaoTurma[] = []
  for (const bruto of edicoes) {
    const e = (bruto ?? {}) as Record<string, unknown>
    const exame = String(e.exame ?? '')
    const dias = Number(e.dias)
    const k = `${exame}-${dias}`
    const erro = (campo: string, mensagem: string) => erros.push({ exame, dias, campo, mensagem })
    if (!base.some((t) => chave(t) === k) || vistos.has(k)) { erro('turma', 'turma desconhecida ou repetida'); continue }
    vistos.add(k)
    const opcional = typeof e.inicio2 === 'string' && e.inicio2 !== ''
    let ok = true
    for (const campo of ['vendasIni', 'vendasFim', 'inicio'] as const) {
      if (!dataValida(e[campo])) { erro(campo, 'data inválida ou vazia'); ok = false }
    }
    if (opcional && !dataValida(e.inicio2)) { erro('inicio2', 'data inválida'); ok = false }
    if (!ok) continue
    const t = { exame, dias, vendasIni: e.vendasIni as string, vendasFim: e.vendasFim as string, inicio: e.inicio as string,
      ...(opcional ? { inicio2: e.inicio2 as string } : {}), aConfirmar: e.aConfirmar === true, fimVendasAConfirmar: e.fimVendasAConfirmar === true }
    if (t.vendasFim < t.vendasIni) erro('vendasFim', 'o fim das vendas não pode ser antes da abertura')
    if (t.inicio < t.vendasIni) erro('inicio', 'o início da turma não pode ser antes da abertura das vendas')
    if (t.inicio2 && t.inicio2 < t.inicio) erro('inicio2', 'o início 2 não pode ser antes do início')
    limpas.push(t)
  }
  for (const t of base) if (!vistos.has(chave(t))) erros.push({ exame: t.exame, dias: t.dias, campo: 'turma', mensagem: 'turma ausente na lista' })
  return erros.length ? { ok: false, erros } : { ok: true, edicoes: limpas }
}

const cache = new WeakMap<readonly Turma[], Logic>()
/** A mesma lógica de recomendação do quiz, mas com a lista de turmas dada. */
export function logicaCom(turmas: readonly Turma[]): Logic {
  let L = cache.get(turmas)
  if (!L) { L = make({ ...data, turmas }); cache.set(turmas, L) }
  return L
}
