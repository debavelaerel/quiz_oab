import { describe, expect, it } from 'vitest'
import { alternar, fimSemestre, hintDe, juntar, opcoesDe, tituloDe } from './copy'

describe('tituloDe', () => {
  it('periodo semestral troca {fimSemestre} conforme o semestre de hoje', () => {
    expect(tituloDe('periodo', { regime: 'sem' }, '2026-09-30')).toBe('Qual período você está cursando até 31 de dezembro de 2026?')
    expect(tituloDe('periodo', { regime: 'sem' }, '2027-03-01')).toBe('Qual período você está cursando até 30 de junho de 2027?')
    expect(fimSemestre('2026-06-30')).toBe('30 de junho de 2026')
    expect(fimSemestre('2026-07-01')).toBe('31 de dezembro de 2026')
  })
  it('periodo anual usa tituloAno com {ano}', () => {
    expect(tituloDe('periodo', { regime: 'ano' }, '2026-09-30')).toBe('Qual ano do curso você está cursando em 2026?')
  })
  it('metodo muda de título pra quem reprovou', () => {
    expect(tituloDe('metodo', { tentativa: 'nunca' }, '2026-09-30')).toBe('Você já estudou pra OAB antes? Se sim, como estudava?')
    expect(tituloDe('metodo', { tentativa: 'reprov' }, '2026-09-30')).toBe('Quando você fez a prova, qual era o seu principal jeito de estudar?')
  })
  it('inscrito cita o exame de inscrição fechada, e o hint a data', () => {
    const A = { situacao: 'formado', tentativa: 'nunca' }
    expect(tituloDe('inscrito', A, '2026-10-10')).toBe('Você fez a inscrição na OAB 48?')
    expect(hintDe('inscrito', A, '2026-10-10')).toBe('As inscrições da OAB 48 fecharam em 05/10/2026.')
  })
})

describe('hintDe', () => {
  it('periodo depende do regime; perguntas sem hint devolvem vazio', () => {
    expect(hintDe('periodo', { regime: 'ano' }, '2026-09-30')).toBe('É o ano em que a sua matrícula está agora.')
    expect(hintDe('periodo', { regime: 'sem' }, '2026-09-30')).toMatch(/^É o período em que a sua matrícula está neste semestre/)
    expect(hintDe('rotina', {}, '2026-09-30')).toBe('Pode marcar mais de uma.')
    expect(hintDe('situacao', {}, '2026-09-30')).toBe('')
  })
})

describe('opcoesDe', () => {
  it('traz rótulo e linha de apoio do original', () => {
    expect(opcoesDe('situacao', {})).toEqual([
      { v: 'cursando', t: 'Estou cursando Direito' },
      { v: 'formado', t: 'Já me formei', s: 'Sou bacharel em Direito.' },
    ])
  })
  it('metodo usa rotulosReprov pra quem reprovou', () => {
    expect(opcoesDe('metodo', { tentativa: 'reprov' })[0]).toEqual({ v: 'zero', t: 'Fui pra prova sem me preparar' })
    expect(opcoesDe('metodo', { tentativa: 'nunca' })[0]).toEqual({ v: 'zero', t: 'Ainda não comecei a estudar' })
  })
  it('regime ano: periodo só 1–5; trava=denovo só pra reprovado', () => {
    expect(opcoesDe('periodo', { regime: 'ano' }).map((o) => o.v)).toEqual(['1', '2', '3', '4', '5'])
    expect(opcoesDe('trava', { tentativa: 'nunca' }).map((o) => o.v)).not.toContain('denovo')
    expect(opcoesDe('trava', { tentativa: 'reprov' }).map((o) => o.v)).toContain('denovo')
  })
})

describe('múltipla escolha', () => {
  it('a exclusiva limpa as outras e outra opção limpa a exclusiva', () => {
    expect(alternar(['filhos', 'casa'], 'nada', 'nada')).toEqual(['nada'])
    expect(alternar(['nada'], 'casa', 'nada')).toEqual(['casa'])
    expect(alternar(['filhos'], 'filhos', 'nada')).toEqual([])
    expect(alternar(['filhos'], 'casa')).toEqual(['filhos', 'casa'])
  })
  it('junta na ordem canônica das opções', () => {
    const ops = opcoesDe('rotina', {})
    expect(juntar(ops, ['outros', 'filhos'])).toBe('filhos+outros')
  })
})
