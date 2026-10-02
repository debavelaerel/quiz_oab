// Agregações do /admin/analytics: funções puras sobre as sessões (sem I/O). Datas no fuso de São Paulo.
import data from '@/lib/oab/data.json'
import { completo, type Resp } from '@/lib/oab/fluxo'
import type { QuizSession } from './server/types'

const TESTE = data.teste as { id: string; disciplina: string; gabarito: string }[]
const TZ = 'America/Sao_Paulo'
const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
const DIA_MS = 86_400_000

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0)
const testeCompleto = (s: QuizSession) => s.teste.length === TESTE.length
const acertosDe = (s: QuizSession) => s.teste.filter((l, i) => l === TESTE[i].gabarito).length

/** Acertos do teste da sessão (null se o teste não foi concluído) e o total de questões. */
export const TOTAL_TESTE = TESTE.length
export const acertosDaSessao = (s: QuizSession): number | null => (testeCompleto(s) ? acertosDe(s) : null)

// ---- período
export type Periodo = 'tudo' | '30' | '7'
export const lerPeriodo = (v: string | undefined): Periodo => (v === '7' || v === '30' ? v : 'tudo')

export function filtrarPeriodo(sessoes: QuizSession[], periodo: Periodo, agora: Date = new Date()): QuizSession[] {
  if (periodo === 'tudo') return sessoes
  const corte = agora.getTime() - Number(periodo) * DIA_MS
  return sessoes.filter((s) => new Date(s.startedAt).getTime() >= corte)
}

// ---- distribuições
export type Item = { valor: string; contagem: number; pct: number }

export function distribuicao(valores: (string | null | undefined)[]): Item[] {
  const cont = new Map<string, number>()
  for (const v of valores) if (v !== null && v !== undefined && v !== '') cont.set(v, (cont.get(v) ?? 0) + 1)
  const total = [...cont.values()].reduce((a, b) => a + b, 0)
  return [...cont.entries()]
    .map(([valor, contagem]) => ({ valor, contagem, pct: pct(contagem, total) }))
    .sort((a, b) => b.contagem - a.contagem || a.valor.localeCompare(b.valor))
}

export type Dia = { data: string; contagem: number }

export function sessoesPorDia(isos: string[]): Dia[] {
  if (isos.length === 0) return []
  const cont = new Map<string, number>()
  for (const iso of isos) { const d = fmtDia.format(new Date(iso)); cont.set(d, (cont.get(d) ?? 0) + 1) }
  const dias = [...cont.keys()].sort()
  const out: Dia[] = []
  for (let t = new Date(`${dias[0]}T12:00:00Z`).getTime(); ; t += DIA_MS) {
    const d = new Date(t).toISOString().slice(0, 10)
    out.push({ data: d, contagem: cont.get(d) ?? 0 })
    if (d >= dias[dias.length - 1]) break
  }
  return out
}

// ---- funil
export type Etapa = { etapa: string; total: number; pct: number }

export function funil(sessoes: QuizSession[]): Etapa[] {
  const base = sessoes.length
  const etapas: [string, number][] = [
    ['Iniciou o quiz', base],
    ['Terminou as perguntas', sessoes.filter((s) => completo(s.respostas as Resp, s.hoje)).length],
    ['Fez o teste', sessoes.filter(testeCompleto).length],
    ['Deixou o contato', sessoes.filter((s) => s.status === 'concluido').length],
    ['Diagnóstico gerado', sessoes.filter((s) => s.diagnosticoStatus === 'pronto').length],
  ]
  return etapas.map(([etapa, total]) => ({ etapa, total, pct: pct(total, base) }))
}

// ---- médias e teste
export function mediaMinutos(sessoes: QuizSession[]): number | null {
  const min = sessoes.filter((s) => s.status === 'concluido' && s.completedAt)
    .map((s) => (new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime()) / 60_000)
  return min.length ? min.reduce((a, b) => a + b, 0) / min.length : null
}

export function mediaAcertos(sessoes: QuizSession[]): number | null {
  const com = sessoes.filter(testeCompleto)
  return com.length ? com.reduce((soma, s) => soma + acertosDe(s), 0) / com.length : null
}

export function distribuicaoAcertos(sessoes: QuizSession[]): number[] {
  const d = Array.from({ length: TESTE.length + 1 }, () => 0)
  for (const s of sessoes.filter(testeCompleto)) d[acertosDe(s)] += 1
  return d
}

export type QuestaoErrada = { id: string; disciplina: string; erros: number; total: number; pct: number }

export function questoesMaisErradas(sessoes: QuizSession[]): QuestaoErrada[] {
  const com = sessoes.filter(testeCompleto)
  if (com.length === 0) return []
  return TESTE.map((q, i) => {
    const erros = com.filter((s) => s.teste[i] !== q.gabarito).length
    return { id: q.id, disciplina: q.disciplina, erros, total: com.length, pct: pct(erros, com.length) }
  }).sort((a, b) => b.pct - a.pct || a.id.localeCompare(b.id))
}

// ---- onde desistem, origem, segmentos
export function abandonoPorPergunta(sessoes: QuizSession[]): Item[] {
  return distribuicao(sessoes.filter((s) => s.status !== 'concluido').map((s) => s.ultimaPergunta ?? '(sem etapa)'))
}

export type Origem = { valor: string; iniciadas: number; concluidas: number; pct: number }

export function conversaoPorOrigem(sessoes: QuizSession[], campo: 'utmSource' | 'utmCampaign'): Origem[] {
  const grupos = new Map<string, { iniciadas: number; concluidas: number }>()
  for (const s of sessoes) {
    const k = s[campo] || '(direto)'
    const g = grupos.get(k) ?? { iniciadas: 0, concluidas: 0 }
    g.iniciadas += 1
    if (s.status === 'concluido') g.concluidas += 1
    grupos.set(k, g)
  }
  return [...grupos.entries()]
    .map(([valor, g]) => ({ valor, ...g, pct: pct(g.concluidas, g.iniciadas) }))
    .sort((a, b) => b.iniciadas - a.iniciadas || a.valor.localeCompare(b.valor))
}

export type Segmento = { exame: string; compromisso: string; investir: string; total: number }

export function segmentosComerciais(sessoes: QuizSession[]): Segmento[] {
  const grupos = new Map<string, Segmento>()
  for (const s of sessoes) {
    if (s.status !== 'concluido' || !s.exame) continue
    const r = s.respostas as Record<string, string | undefined>
    const compromisso = r.compromisso ?? '—'
    const investir = r.investir ?? '—'
    const chave = `${s.exame}|${compromisso}|${investir}`
    const g = grupos.get(chave) ?? { exame: s.exame, compromisso, investir, total: 0 }
    g.total += 1
    grupos.set(chave, g)
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total || a.exame.localeCompare(b.exame))
}
