import { describe, expect, it } from 'vitest'
import { ofertaAnual } from './oferta'

const ok = (exame: string, turma = 90) => ({ tipo: 'ok' as const, exame, turma })

describe('ofertaAnual', () => {
  it('não oferece quando não há prova a recomendar', () => {
    expect(ofertaAnual({}, { tipo: 'f2' })).toBeNull()
    expect(ofertaAnual({}, { tipo: 'sem_prova' })).toBeNull()
    expect(ofertaAnual({}, { tipo: 'cedo', quando: { ano: 2028, sem: 1 } })).toBeNull()
  })
  it('regra 3: sem nenhuma turma à venda, só a anual', () => {
    expect(ofertaAnual({}, { tipo: 'sem_turma', exame: '49' })).toEqual({ motivo: 'sem_produto', posicao: 'unica' })
  })
  it('regra 1: OAB 50 tem a anual como principal', () => {
    expect(ofertaAnual({ tentativa: 'nunca' }, ok('50', 180))).toEqual({ motivo: 'oab50', posicao: 'principal' })
  })
  it('regra 2: reprovou 3 vezes ou mais, anual em segundo', () => {
    expect(ofertaAnual({ tentativa: 'reprov', vezes: 'v3' }, ok('49'))).toEqual({ motivo: 'reprovou_varias', posicao: 'segunda' })
  })
  it('regra 2 não vale para 1 ou 2 reprovações, nem para quem nunca fez', () => {
    expect(ofertaAnual({ tentativa: 'reprov', vezes: 'v2' }, ok('49'))).toBeNull()
    expect(ofertaAnual({ tentativa: 'reprov', vezes: 'v1' }, ok('48'))).toBeNull()
    expect(ofertaAnual({ tentativa: 'nunca' }, ok('48'))).toBeNull()
  })
  it('sobreposição: OAB 50 ganha de reprovou_varias', () => {
    expect(ofertaAnual({ tentativa: 'reprov', vezes: 'v3' }, ok('50'))?.motivo).toBe('oab50')
  })
})
