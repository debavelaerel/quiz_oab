import { describe, expect, it } from 'vitest'
import { paraFatias } from './adminPie'

describe('paraFatias', () => {
  it('sem dados ou total zero → []', () => {
    expect(paraFatias([], 50)).toEqual([])
    expect(paraFatias([{ valor: 'a', contagem: 0 }], 50)).toEqual([])
  })
  it('uma fatia vira o círculo inteiro', () => {
    const f = paraFatias([{ valor: 'a', contagem: 3 }], 50)
    expect(f).toHaveLength(1)
    expect(f[0].path.match(/A 50 50 0 1 1/g)).toHaveLength(2)
  })
  it('duas fatias iguais: 2 caminhos, arco pequeno; uma fatia > 50% usa o arco grande', () => {
    const iguais = paraFatias([{ valor: 'a', contagem: 1 }, { valor: 'b', contagem: 1 }], 50)
    expect(iguais.map((x) => x.valor)).toEqual(['a', 'b'])
    const grande = paraFatias([{ valor: 'a', contagem: 3 }, { valor: 'b', contagem: 1 }], 50)
    expect(grande[0].path).toContain('A 50 50 0 1 1')
    expect(grande[1].path).toContain('A 50 50 0 0 1')
  })
})
