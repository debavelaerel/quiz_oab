import { describe, expect, it } from 'vitest'
import data from './data.json'
import {
  aplica, completo, ORDER, totalPassos, valorValido, etapaAtual, opcoesValidas, proxima, RespostaInvalidaError, type Resp, sanear, saida, validarTeste,
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
    expect(sanear({ ...base, rotina: 'filhos+nada' }, HOJE).rotina).toBeUndefined()
    expect(sanear({ ...base, rotina: 'filhos+filhos' }, HOJE).rotina).toBeUndefined()
    expect(sanear({ ...base, rotina: 'nada' }, HOJE).rotina).toBe('nada')
  })
  it('controles positivos: periodo 8 sob regime sem e trava denovo sob reprov são mantidos', () => {
    expect(sanear({ situacao: 'cursando', regime: 'sem', periodo: '8' }, HOJE).periodo).toBe('8')
    expect(sanear({ situacao: 'formado', tentativa: 'reprov', trava: 'denovo' }, HOJE).trava).toBe('denovo')
  })
  it('corpo que não é objeto lança RespostaInvalidaError', () => {
    expect(() => sanear(null as unknown as Record<string, unknown>, HOJE)).toThrow(RespostaInvalidaError)
    expect(() => sanear([] as unknown as Record<string, unknown>, HOJE)).toThrow(RespostaInvalidaError)
    expect(() => sanear('x' as unknown as Record<string, unknown>, HOJE)).toThrow(RespostaInvalidaError)
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
  it('completo é true para formado que nunca fez o exame com tudo respondido', () => {
    const A: Resp = { situacao: 'formado', tentativa: 'nunca' }
    for (const k of ORDER) {
      if (A[k] === undefined && aplica(k, A, HOJE)) A[k] = opcoesValidas(k, A)[0]
    }
    expect(saida(A, HOJE)).toBeNull()
    expect(Object.keys(A).length).toBeGreaterThan(5)
    expect(completo(A, HOJE)).toBe(true)
    expect(sanear(A, HOJE)).toEqual(A)
    const { parcela: _p, ...semUltima } = A
    void _p
    expect(completo({ ...semUltima, metodo: undefined }, HOJE)).toBe(false)
  })
  it('data.json tem opcoes para toda pergunta de ORDER', () => {
    const P = data.perguntas as Record<string, { opcoes?: unknown[] }>
    for (const k of ORDER) expect(Array.isArray(P[k]?.opcoes)).toBe(true)
    expect(valorValido('situacao', 'cursando', {})).toBe(true)
  })
  it('totalPassos usa o caminho de estudante antes da 1ª resposta', () => {
    const cursando = ORDER.filter((k) => aplica(k, { situacao: 'cursando' }, HOJE)).length
    expect(totalPassos({}, HOJE)).toBe(cursando)
    expect(totalPassos({}, HOJE)).toBeGreaterThanOrEqual(totalPassos({ situacao: 'formado' }, HOJE))
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
