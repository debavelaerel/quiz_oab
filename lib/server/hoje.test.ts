import { describe, expect, it } from 'vitest'
import { hojeSaoPaulo, resolverHoje } from './hoje'

describe('hojeSaoPaulo', () => {
  it('23:30 em São Paulo ainda é o mesmo dia mesmo já sendo o dia seguinte em UTC', () => {
    expect(hojeSaoPaulo(new Date('2026-10-01T02:30:00Z'))).toBe('2026-09-30')
  })
  it('meio-dia UTC', () => {
    expect(hojeSaoPaulo(new Date('2026-09-30T12:00:00Z'))).toBe('2026-09-30')
  })
})

describe('resolverHoje', () => {
  const agora = new Date('2026-09-30T12:00:00Z')
  it('ignora ?hoje sem a flag', () => {
    expect(resolverHoje({ agora, override: '2027-01-15', permitir: false })).toBe('2026-09-30')
  })
  it('usa ?hoje com a flag e formato válido', () => {
    expect(resolverHoje({ agora, override: '2027-01-15', permitir: true })).toBe('2027-01-15')
  })
  it('ignora override malformado mesmo com a flag', () => {
    expect(resolverHoje({ agora, override: '2027-1-5', permitir: true })).toBe('2026-09-30')
  })
})
