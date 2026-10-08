// Quando oferecer a turma anual (camada sobre a recomendação; o logic.js não é editado).
// Ordem de prioridade: 1) sem turma à venda; 2) OAB 50; 3) reprovou 3 vezes ou mais.
import data from './data.json'
import type { Recomendacao, Respostas } from './logic'

export type OfertaAnual = {
  motivo: 'sem_produto' | 'oab50' | 'reprovou_varias'
  /** `principal`: a anual vem primeiro; `segunda`: depois da turma comum; `unica`: não há turma comum. */
  posicao: 'principal' | 'segunda' | 'unica'
}

const EXAMES_ANUAL: readonly string[] = data.anual.exames

export function ofertaAnual(A: Respostas, rec: Recomendacao): OfertaAnual | null {
  if (rec.tipo === 'f2' || rec.tipo === 'cedo' || rec.tipo === 'sem_prova') return null
  if (rec.tipo === 'sem_turma') return { motivo: 'sem_produto', posicao: 'unica' }
  if (EXAMES_ANUAL.includes(rec.exame)) return { motivo: 'oab50', posicao: 'principal' }
  if (A.tentativa === 'reprov' && A.vezes === 'v3') return { motivo: 'reprovou_varias', posicao: 'segunda' }
  return null
}
