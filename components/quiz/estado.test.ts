import { describe, expect, it } from 'vitest'
import { sanear, type Resp } from '@/lib/oab/fluxo'
import { comLetra, comResposta, limparDependentes, semLetra, semResposta } from './estado'

const HOJE = '2026-09-30'
const reprovado: Resp = {
  situacao: 'formado', tentativa: 'reprov', vezes: 'v2', pontos: 'p1', metodo: 'video', trava: 'tempo+denovo', motivo: 'orgulho',
}

describe('limparDependentes', () => {
  it('trocar tentativa de reprov pra nunca derruba vezes, pontos e a trava com "denovo"', () => {
    const A = comResposta(reprovado, 'tentativa', 'nunca', HOJE)
    expect(A).toEqual({ situacao: 'formado', tentativa: 'nunca', metodo: 'video', motivo: 'orgulho' })
  })
  it('trocar regime pra ano derruba periodo 6–10, mantém 1–5', () => {
    const base: Resp = { situacao: 'cursando', regime: 'sem', periodo: '9', grade: 'dia' }
    expect(comResposta(base, 'regime', 'ano', HOJE)).toEqual({ situacao: 'cursando', regime: 'ano', grade: 'dia' })
    expect(comResposta({ ...base, periodo: '5' }, 'regime', 'ano', HOJE)).toMatchObject({ periodo: '5' })
  })
  it('virar formado derruba regime, periodo e grade', () => {
    const A = comResposta({ situacao: 'cursando', regime: 'sem', periodo: '9', grade: 'dia', tentativa: 'nunca' }, 'situacao', 'formado', HOJE)
    expect(A).toEqual({ situacao: 'formado', tentativa: 'nunca' })
  })
  it('investir diferente de parcela derruba parcela', () => {
    expect(comResposta({ investir: 'parcela', parcela: 'p50' }, 'investir', 'avista', HOJE)).toEqual({ investir: 'avista' })
  })
  it('para numa saída antecipada (f2), como o servidor', () => {
    expect(comResposta(reprovado, 'tentativa', 'f2', HOJE)).toEqual({ situacao: 'formado', tentativa: 'f2' })
  })
  it('é a mesma regra do sanear do servidor', () => {
    const casos: Resp[] = [
      { ...reprovado, tentativa: 'nunca' },
      { situacao: 'cursando', regime: 'ano', periodo: '9', grade: 'dia', investir: 'nada', parcela: 'p80' },
      { situacao: 'formado', rotina: 'filhos+casa', trava: 'prova+materia' },
    ]
    for (const c of casos) expect(limparDependentes(c, HOJE)).toEqual(sanear(c as Record<string, unknown>, HOJE))
  })
})

describe('semResposta / teste', () => {
  it('apagar só muda o objeto quando a chave existe', () => {
    const A: Resp = { situacao: 'formado' }
    expect(semResposta(A, 'tentativa')).toBe(A)
    expect(semResposta(A, 'situacao')).toEqual({})
  })
  it('letras do teste formam um prefixo', () => {
    expect(comLetra(['A', 'B'], 2, 'X')).toEqual(['A', 'B', 'X'])
    expect(comLetra(['A', 'B', 'C'], 1, 'D')).toEqual(['A', 'D'])
    expect(semLetra(['A', 'B', 'C'], 2)).toEqual(['A', 'B'])
    const t = ['A']
    expect(semLetra(t, 3)).toBe(t)
  })
})
