import { describe, expect, it } from 'vitest'
import { celulaCsv, montarCsv } from './csv'

describe('csv', () => {
  it('escapa aspas, vírgulas e quebras de linha', () => {
    expect(celulaCsv('a,"b"\nc')).toBe('"a,""b""\nc"')
  })
  it('neutraliza injeção de fórmula', () => {
    for (const p of ['=1+1', '+1', '-1', '@x']) expect(celulaCsv(p)).toBe(`"'${p}"`)
    expect(celulaCsv('\t=cmd')).toBe(`"'\t=cmd"`)
    expect(celulaCsv('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`)
  })
  it('null e undefined viram vazio; números ficam puros', () => {
    expect(celulaCsv(null)).toBe('')
    expect(celulaCsv(undefined)).toBe('')
    expect(celulaCsv(90)).toBe('90')
    expect(celulaCsv(-3)).toBe('-3')
    expect(celulaCsv('texto simples')).toBe('texto simples')
  })
  it('monta cabeçalho e linhas com CRLF', () => {
    expect(montarCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n')
  })
})
