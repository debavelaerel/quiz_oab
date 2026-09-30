import type { Resp } from '@/lib/oab/fluxo'
import type { Recomendacao } from '@/lib/oab/logic'

type Erro = Error & { status: number; corpo: unknown }

async function post<T>(url: string, corpo: unknown, opts: { keepalive?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
    keepalive: opts.keepalive ?? false, signal: opts.signal,
  })
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, corpo: await r.json().catch(() => ({})) }) as Erro
  return r.status === 204 ? (undefined as T) : r.json()
}

export type Utm = { source: string | null; medium: string | null; campaign: string | null; content: string | null; term: string | null }
export type RespostaStart = { session_token: string; hoje: string; retomada: boolean; respostas: Resp; teste: string[]; seq: number }

export type Resultado = {
  recomendacao: Recomendacao & { atalho: unknown }
  nome: string | null
  ref_curta: string
  hoje: string
  diagnostico: { status: string | null; url: string | null }
}

export const api = {
  start: (b: { session_token?: string; utm?: Utm; hoje_override?: string }, signal?: AbortSignal) =>
    post<RespostaStart>('/api/quiz/start', b, { signal }),
  answer: (b: { session_token: string; seq: number; respostas: Resp; teste: string[] }) =>
    post<{ aceito: boolean; status: string; etapa: string }>('/api/quiz/answer', b, { keepalive: true }),
  finish: (b: unknown) => post<Resultado>('/api/quiz/finish', b),
  result: async (token: string): Promise<Resultado> => {
    const r = await fetch(`/api/quiz/result?session_token=${encodeURIComponent(token)}`)
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, corpo: await r.json().catch(() => ({})) }) as Erro
    return r.json()
  },
  whatsapp: (token: string) => post<void>('/api/quiz/whatsapp', { session_token: token }, { keepalive: true }),
}
