// Navegação do quiz (pilha de telas do botão "voltar") e barra de progresso — funções puras,
// portadas de go()/$back.onclick do original.
import { aplica, ORDER, totalPassos, type Campo, type Resp } from '@/lib/oab/fluxo'

export type TelaTeste = 't0' | 't1' | 't2' | 't3' | 't4'
export type Tela = 'intro' | Campo | 'parte2' | TelaTeste | 'dados' | 'resultado' | 'cedo' | 'f2'

export const ehPergunta = (t: Tela): t is Campo => (ORDER as readonly string[]).includes(t)
export const indiceTeste = (t: Tela): number => (/^t\d$/.test(t) ? Number(t.slice(1)) : -1)

/** A pilha inclui a tela atual no topo (como `hist` no original). */
export type Nav = { hist: Tela[] }
export const navInicial: Nav = { hist: ['intro'] }
export const telaAtual = (n: Nav): Tela => n.hist[n.hist.length - 1]
export const podeVoltar = (n: Nav): boolean => n.hist.length > 1

export function irPara(n: Nav, t: Tela): Nav {
  return { hist: [...n.hist, t] }
}

/**
 * Volta uma tela. `saindo` é a tela abandonada: se for pergunta, a resposta dela é apagada;
 * se for questão do teste, a letra dela (regra do original).
 */
export function voltar(n: Nav): { nav: Nav; saindo: Tela | null } {
  if (!podeVoltar(n)) return { nav: n, saindo: null }
  return { nav: { hist: n.hist.slice(0, -1) }, saindo: telaAtual(n) }
}

/** Posição da pergunta no caminho atual (0 = primeira), ou -1. */
export function indicePergunta(t: Tela, A: Resp, hoje: string): number {
  if (t === 'situacao') return 0
  if (!ehPergunta(t)) return -1
  return ORDER.filter((k) => aplica(k, A, hoje)).indexOf(t)
}

/** Barra de progresso: `null` = escondida; senão a largura em %. */
export function progresso(t: Tela, A: Resp, hoje: string, qtdTeste: number): number | null {
  if (t === 'dados') return 96
  const q = indicePergunta(t, A, hoje)
  if (q >= 0) return Math.round((q / totalPassos(A, hoje)) * 100)
  const i = indiceTeste(t)
  if (i >= 0) return Math.round((i / qtdTeste) * 100)
  return null
}
