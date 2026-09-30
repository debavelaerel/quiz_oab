import data from './data.json'
import { make } from './logic'

export const L = make(data)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = data.perguntas as Record<string, any>
const QTD_TESTE = (data.teste as unknown[]).length

// Ordem em que as perguntas aparecem (diferente da ordem dos campos do código QO1).
export const ORDER = [
  'situacao', 'regime', 'periodo', 'grade', 'tentativa', 'vezes', 'pontos', 'nivel', 'inscrito', 'metodo',
  'trava', 'motivo', 'compromisso', 'trabalho', 'rotina', 'horas', 'vde', 'investir', 'parcela',
] as const
export type Campo = (typeof ORDER)[number]
export type Resp = Partial<Record<Campo, string>>
export type Saida = 'cedo' | 'f2'

export class RespostaInvalidaError extends Error {}

export function aplica(k: Campo, A: Resp, hoje: string): boolean {
  const cur = A.situacao === 'cursando'
  switch (k) {
    case 'regime': case 'periodo': case 'grade': return cur
    case 'tentativa': return L.perguntaTentativa(A as Record<string, string>)
    case 'pontos': case 'vezes': return A.tentativa === 'reprov'
    case 'nivel': return A.tentativa !== 'reprov'
    case 'inscrito': return !!L.exameInscricaoFechada(A as Record<string, string>, hoje)
    case 'parcela': return A.investir === 'parcela'
    default: return true
  }
}

export function saida(A: Resp, hoje: string): Saida | null {
  if (A.situacao === 'cursando' && A.periodo && L.cedo(A as Record<string, string>, hoje)) return 'cedo'
  if (A.tentativa === 'f2') return 'f2'
  return null
}

export function proxima(de: Campo | 'intro', A: Resp, hoje: string): Campo | 'parte2' | Saida {
  const s = saida(A, hoje)
  if (s) return s
  const inicio = de === 'intro' ? -1 : ORDER.indexOf(de)
  for (let i = inicio + 1; i < ORDER.length; i++) if (aplica(ORDER[i], A, hoje)) return ORDER[i]
  return 'parte2'
}

/** Total de passos da barra de progresso: conta o caminho mais longo (estudante) antes da 1ª resposta. */
export function totalPassos(A: Resp, hoje: string): number {
  const base = A.situacao ? A : { ...A, situacao: 'cursando' }
  return ORDER.filter((k) => aplica(k, base, hoje)).length
}

export function opcoesValidas(k: Campo, A: Resp): string[] {
  let ops: string[] = P[k].opcoes.map((o: string[]) => o[0])
  if (k === 'periodo' && A.regime === 'ano') ops = ops.slice(0, 5)
  if (k === 'trava' && A.tentativa !== 'reprov') ops = ops.filter((v) => !(P.trava.soReprov as string[]).includes(v))
  return ops
}

export function valorValido(k: Campo, v: string, A: Resp): boolean {
  const ops = opcoesValidas(k, A)
  if (!P[k].multi) return ops.includes(v)
  const itens = v.split('+')
  if (itens.some((i) => !ops.includes(i)) || new Set(itens).size !== itens.length) return false
  const exc: string | undefined = P[k].exclusiva
  if (exc && itens.includes(exc) && itens.length > 1) return false
  return ops.filter((o) => itens.includes(o)).join('+') === v // ordem canônica
}

function existeEmDados(k: Campo, v: string): boolean {
  const todas: string[] = P[k].opcoes.map((o: string[]) => o[0])
  return (P[k].multi ? v.split('+') : [v]).every((i) => todas.includes(i))
}

/**
 * Normaliza um snapshot vindo do cliente. Lança para campo/valor que nem existe em data.json
 * (cliente adulterado). Descarta, sem erro, o que só deixou de valer pelo contexto
 * (botão "voltar": pergunta que não se aplica mais, opção que não existe mais naquele contexto)
 * e tudo que vem depois de uma saída antecipada.
 */
export function sanear(entrada: Record<string, unknown>, hoje: string): Resp {
  for (const [k, v] of Object.entries(entrada)) {
    if (!(ORDER as readonly string[]).includes(k)) throw new RespostaInvalidaError(`campo desconhecido: ${k}`)
    if (typeof v !== 'string') throw new RespostaInvalidaError(`valor inválido em ${k}`)
    if (!existeEmDados(k as Campo, v)) throw new RespostaInvalidaError(`resposta inexistente em ${k}: ${v}`)
  }
  const A: Resp = {}
  for (const k of ORDER) {
    const v = entrada[k] as string | undefined
    if (v === undefined) continue
    if (!aplica(k, A, hoje) || !valorValido(k, v, A)) continue
    A[k] = v
    if (saida(A, hoje)) break
  }
  return A
}

export function completo(A: Resp, hoje: string): boolean {
  if (saida(A, hoje)) return false
  return ORDER.every((k) => !aplica(k, A, hoje) || A[k] !== undefined)
}

export function validarTeste(teste: unknown, parcial: boolean): string[] {
  if (!Array.isArray(teste) || teste.length > QTD_TESTE) throw new RespostaInvalidaError('teste inválido')
  if (teste.some((l) => typeof l !== 'string' || !/^[A-DX]$/.test(l))) throw new RespostaInvalidaError('letra de teste inválida')
  if (!parcial && teste.length !== QTD_TESTE) throw new RespostaInvalidaError(`o teste precisa de ${QTD_TESTE} respostas`)
  return teste as string[]
}

/** Onde a pessoa está (vai em quiz_sessions.ultima_pergunta — base do abandono por pergunta). */
export function etapaAtual(A: Resp, teste: string[], hoje: string): string {
  const s = saida(A, hoje)
  if (s) return s
  const falta = ORDER.find((k) => aplica(k, A, hoje) && A[k] === undefined)
  if (falta) return falta
  return teste.length < QTD_TESTE ? `t${teste.length}` : 'dados'
}
