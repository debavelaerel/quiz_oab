import { describe, expect, it } from 'vitest'
import { ALFABETO_REF, gerarRefCurta } from './refCurta'

describe('refCurta', () => {
  it('tem 4 caracteres do alfabeto sem ambíguos', () => {
    for (let i = 0; i < 200; i++) {
      const r = gerarRefCurta()
      expect(r).toHaveLength(4)
      for (const c of r) expect(ALFABETO_REF).toContain(c)
    }
    expect(ALFABETO_REF).not.toMatch(/[01OIL]/)
  })
})
