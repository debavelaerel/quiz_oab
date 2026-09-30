import { describe, expect, it } from 'vitest'
import {
  aplica, completo, etapaAtual, opcoesValidas, proxima, RespostaInvalidaError, sanear, saida, validarTeste,
} from './fluxo'

const HOJE = '2026-09-30'

describe('aplica / proxima', () => {
  it('formado pula regime, periodo e grade', () => {
    expect(aplica('regime', { situacao: 'formado' }, HOJE)).toBe(false)
    expect(proxima('situacao', { situacao: 'formado' }, HOJE)).toBe('tentativa')
  })
  it('vezes e pontos só para reprovado; nivel só para quem nunca fez', () => {
    expect(aplica('vezes', { tentativa: 'reprov' }, HOJE)).toBe(true)
    expect(aplica('nivel', { tentativa: 'reprov' }, HOJE)).toBe(false)
    expect(aplica('nivel', { tentativa: 'nunca' }, HOJE)).toBe(true)
  })
  it('depois da última pergunta vem a parte 2', () => {
    expect(proxima('parcela', { situacao: 'formado', tentativa: 'nunca' }, HOJE)).toBe('parte2')
  })
})

describe('saida', () => {
  it('f2 sai na hora', () => {
    expect(saida({ situacao: 'formado', tentativa: 'f2' }, HOJE)).toBe('f2')
    expect(proxima('tentativa', { situacao: 'formado', tentativa: 'f2' }, HOJE)).toBe('f2')
  })
  it('estudante do 1º período em 2026 sai como cedo', () => {
    expect(saida({ situacao: 'cursando', regime: 'sem', periodo: '1' }, HOJE)).toBe('cedo')
  })
})

describe('opcoesValidas', () => {
  it('regime ano limita periodo a 1–5', () => {
    expect(opcoesValidas('periodo', { regime: 'ano' })).toEqual(['1', '2', '3', '4', '5'])
    expect(opcoesValidas('periodo', { regime: 'sem' })).toHaveLength(10)
  })
  it('trava=denovo só para reprovado', () => {
    expect(opcoesValidas('trava', { tentativa: 'nunca' })).not.toContain('denovo')
    expect(opcoesValidas('trava', { tentativa: 'reprov' })).toContain('denovo')
  })
})

describe('sanear (botão voltar / snapshot)', () => {
  it('descarta trava=denovo quando a tentativa deixou de ser reprov', () => {
    const r = sanear({ situacao: 'formado', tentativa: 'nunca', nivel: 'b1', trava: 'denovo' }, HOJE)
    expect(r.trava).toBeUndefined()
  })
  it('descarta periodo 8 quando o regime é ano', () => {
    const r = sanear({ situacao: 'cursando', regime: 'ano', periodo: '8' }, HOJE)
    expect(r.periodo).toBeUndefined()
  })
  it('descarta respostas de perguntas que não se aplicam (formado com regime)', () => {
    const r = sanear({ situacao: 'formado', regime: 'sem', tentativa: 'nunca' }, HOJE)
    expect(r.regime).toBeUndefined()
  })
  it('descarta tudo que vem depois de uma saída antecipada', () => {
    const r = sanear({ situacao: 'formado', tentativa: 'f2', metodo: 'zero', horas: 'h3' }, HOJE)
    expect(r).toEqual({ situacao: 'formado', tentativa: 'f2' })
  })
  it('multi: aceita ordem canônica e rejeita fora de ordem, repetido ou exclusiva misturada', () => {
    const base = { situacao: 'formado', tentativa: 'nunca', nivel: 'b1' }
    expect(sanear({ ...base, rotina: 'filhos+casa' }, HOJE).rotina).toBe('filhos+casa')
    expect(sanear({ ...base, rotina: 'casa+filhos' }, HOJE).rotina).toBeUndefined()
    expect(sanear({ ...base, rotina: 'nada+filhos' }, HOJE).rotina).toBeUndefined()
  })
  it('lança erro para campo ou valor que nem existe em data.json', () => {
    expect(() => sanear({ foo: 'bar' }, HOJE)).toThrow(RespostaInvalidaError)
    expect(() => sanear({ situacao: 'marciano' }, HOJE)).toThrow(RespostaInvalidaError)
    expect(() => sanear({ situacao: 3 as unknown as string }, HOJE)).toThrow(RespostaInvalidaError)
  })
})

describe('completo / etapaAtual / teste', () => {
  it('completo exige todas as perguntas aplicáveis e nenhuma saída', () => {
    expect(completo({ situacao: 'formado' }, HOJE)).toBe(false)
    expect(completo({ situacao: 'formado', tentativa: 'f2' }, HOJE)).toBe(false)
  })
  it('etapaAtual aponta a próxima pergunta sem resposta, depois t0..t4, depois dados', () => {
    expect(etapaAtual({}, [], HOJE)).toBe('situacao')
    expect(etapaAtual({ situacao: 'formado' }, [], HOJE)).toBe('tentativa')
  })
  it('validarTeste aceita A–D e X, até 5; exige 5 quando não é parcial', () => {
    expect(validarTeste(['A', 'X'], true)).toEqual(['A', 'X'])
    expect(() => validarTeste(['A', 'E'], true)).toThrow(RespostaInvalidaError)
    expect(() => validarTeste(['A', 'B'], false)).toThrow(RespostaInvalidaError)
    expect(validarTeste(['A', 'B', 'C', 'D', 'X'], false)).toHaveLength(5)
  })
})
