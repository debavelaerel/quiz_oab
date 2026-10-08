import { describe, expect, it } from 'vitest'
import { aplicarEdicoes, logicaCom, TURMAS_PADRAO, validarEdicoes, type EdicaoTurma } from './turmas'

const todas = (): EdicaoTurma[] => TURMAS_PADRAO.map((t) => ({ ...t }))
const com = (exame: string, dias: number, mudanca: Partial<EdicaoTurma>) =>
  todas().map((t) => (t.exame === exame && t.dias === dias ? { ...t, ...mudanca } : t))

describe('validarEdicoes', () => {
  it('aceita as datas padrão', () => expect(validarEdicoes(todas()).ok).toBe(true))
  it('aceita a mudança da 120D da OAB 49', () => {
    expect(validarEdicoes(com('49', 120, { vendasIni: '2026-12-28', vendasFim: '2027-01-24' })).ok).toBe(true)
  })
  it('recusa fim antes da abertura, início antes da abertura e data impossível', () => {
    const r = validarEdicoes(com('49', 120, { vendasFim: '2026-12-27' }))
    expect(r.ok === false && r.erros.map((e) => e.campo)).toEqual(['vendasFim'])
    const r2 = validarEdicoes(com('48', 90, { inicio: '2026-09-01' }))
    expect(r2.ok === false && r2.erros[0].campo).toBe('inicio')
    const r3 = validarEdicoes(com('48', 90, { vendasIni: '2026-02-30' }))
    expect(r3.ok === false && r3.erros[0].campo).toBe('vendasIni')
  })
  it('recusa data vazia, turma repetida e turma ausente', () => {
    expect(validarEdicoes(com('48', 90, { vendasIni: '' })).ok).toBe(false)
    expect(validarEdicoes([...todas(), todas()[0]]).ok).toBe(false)
    expect(validarEdicoes(todas().slice(1)).ok).toBe(false)
    expect(validarEdicoes('x').ok).toBe(false)
  })
})

describe('aplicarEdicoes + logicaCom', () => {
  it('troca só as datas e a recomendação acompanha', () => {
    const A = { situacao: 'formado', tentativa: 'nunca', horas: 'h3', nivel: 'b0', inscrito: 's' }
    // Hoje a 90D da OAB 48 está à venda; encerrando-a antes, cai para outra turma.
    const padrao = logicaCom(TURMAS_PADRAO).recomendar(A, '2026-10-08')
    expect(padrao).toMatchObject({ exame: '48', turma: 90 })
    const novas = aplicarEdicoes(com('48', 90, { vendasFim: '2026-10-07' }))
    const rec = logicaCom(novas).recomendar(A, '2026-10-08')
    expect(rec).not.toMatchObject({ exame: '48', turma: 90 })
  })
  it('mantém as horas e a ordem das turmas do data.json', () => {
    const novas = aplicarEdicoes(com('49', 120, { vendasIni: '2026-12-28', vendasFim: '2027-01-24' }))
    expect(novas.map((t) => `${t.exame}-${t.dias}`)).toEqual(TURMAS_PADRAO.map((t) => `${t.exame}-${t.dias}`))
    expect(novas.find((t) => t.exame === '49' && t.dias === 120)?.vendasFim).toBe('2027-01-24')
  })
  it('as flags de "a confirmar" seguem a edição', () => {
    const novas = aplicarEdicoes(com('49', 40, { aConfirmar: false }))
    expect(novas.find((t) => t.exame === '49' && t.dias === 40)?.aConfirmar).toBeUndefined()
  })
})
