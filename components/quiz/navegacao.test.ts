import { describe, expect, it } from 'vitest'
import { indicePergunta, irPara, navInicial, podeVoltar, progresso, telaAtual, voltar } from './navegacao'

const HOJE = '2026-09-30'

describe('pilha de telas', () => {
  it('ir e voltar', () => {
    let n = navInicial
    expect(podeVoltar(n)).toBe(false)
    n = irPara(irPara(n, 'situacao'), 'regime')
    expect(telaAtual(n)).toBe('regime')
    const v = voltar(n)
    expect(v.saindo).toBe('regime')
    expect(telaAtual(v.nav)).toBe('situacao')
    expect(voltar(navInicial)).toEqual({ nav: navInicial, saindo: null })
  })
})

describe('progresso', () => {
  it('situacao é a pergunta 0 e o total usa o caminho mais longo', () => {
    expect(indicePergunta('situacao', {}, HOJE)).toBe(0)
    expect(progresso('situacao', {}, HOJE, 5)).toBe(0)
  })
  it('perguntas seguintes pelo caminho aplicável', () => {
    const A = { situacao: 'formado' }
    expect(indicePergunta('tentativa', A, HOJE)).toBe(1)
    expect(indicePergunta('regime', A, HOJE)).toBe(-1)
  })
  it('teste e dados; telas sem barra devolvem null', () => {
    expect(progresso('t2', {}, HOJE, 5)).toBe(40)
    expect(progresso('dados', {}, HOJE, 5)).toBe(96)
    expect(progresso('intro', {}, HOJE, 5)).toBeNull()
    expect(progresso('parte2', {}, HOJE, 5)).toBeNull()
  })
})

describe('tela do nome', () => {
  it('a tela do nome não tem barra de progresso e voltar dela não apaga resposta', () => {
    expect(progresso('nome', {}, '2026-09-30', 5)).toBeNull()
    const n = irPara(navInicial, 'nome')
    const { saindo } = voltar(n)
    expect(saindo).toBe('nome')
  })
})
