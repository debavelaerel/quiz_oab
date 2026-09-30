import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { lerCodigo, montarCodigo } from './codigo'

const casos = JSON.parse(readFileSync('reference/qual-a-oab-dev/casos-de-teste.json', 'utf8')).casos

describe('codigo QO1', () => {
  it('faz ida e volta idêntica nos 104 casos', () => {
    for (const c of casos) {
      const { A, teste, hoje } = lerCodigo(c.codigo)
      expect(montarCodigo(A, teste, hoje)).toBe(c.codigo)
    }
  })
  it('rejeita prefixo errado e quantidade de partes errada', () => {
    expect(() => lerCodigo('QO2.a.b')).toThrow()
    expect(() => lerCodigo('QO1.a.b.20260930')).toThrow()
  })
})
