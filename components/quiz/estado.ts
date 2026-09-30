// Transições puras do estado de respostas (usadas pelo useQuizSession).
import { aplica, ORDER, saida, valorValido, type Campo, type Resp } from '@/lib/oab/fluxo'

/**
 * Mesma regra do servidor (`sanear`): percorre na ordem das perguntas e derruba o que deixou de
 * se aplicar ou de ser uma opção válida depois de uma mudança, e tudo depois de uma saída
 * antecipada. Ex.: trocar `tentativa` de reprov pra nunca apaga `vezes`/`pontos` e tira
 * `denovo` de `trava` (derrubando a `trava` inteira, que precisa ser respondida de novo).
 */
export function limparDependentes(A: Resp, hoje: string): Resp {
  const out: Resp = {}
  for (const k of ORDER) {
    const v = A[k]
    if (v === undefined || !aplica(k, out, hoje) || !valorValido(k, v, out)) continue
    out[k] = v
    if (saida(out, hoje)) break
  }
  return out
}

export function comResposta(A: Resp, k: Campo, v: string, hoje: string): Resp {
  return limparDependentes({ ...A, [k]: v }, hoje)
}

export function semResposta(A: Resp, k: Campo): Resp {
  if (!(k in A)) return A
  const n = { ...A }
  delete n[k]
  return n
}

/** Letra da questão i do teste; o teste é sempre um prefixo contíguo (t0, t1, ...). */
export function comLetra(teste: readonly string[], i: number, letra: string): string[] {
  const n = teste.slice(0, i)
  n[i] = letra
  return n
}

export function semLetra(teste: readonly string[], i: number): string[] {
  return teste.length > i ? teste.slice(0, i) : (teste as string[])
}

/** Mesmo conteúdo, ignorando a ordem das chaves (o jsonb do servidor reordena). */
export function mesmoEstado(a: Resp, ta: readonly string[], b: Resp, tb: readonly string[]): boolean {
  return ORDER.every((k) => a[k] === b[k]) && ta.length === tb.length && ta.every((l, i) => l === tb[i])
}
