import { describe, expect, it } from 'vitest'
import { lerFiltros, queryFiltros } from './adminFiltros'

describe('adminFiltros', () => {
  it('lê e valida os filtros da URL', () => {
    expect(lerFiltros({ busca: '  Ana ', tipo: 'ok', exame: '48', status: 'concluido', pagina: '3' }))
      .toEqual({ busca: 'Ana', tipo: 'ok', exame: '48', status: 'concluido', pagina: 3 })
  })
  it('descarta valores fora da lista e página inválida', () => {
    expect(lerFiltros({ tipo: 'x', exame: '99', status: 'y', pagina: '-2', busca: '' }))
      .toEqual({ busca: undefined, tipo: undefined, exame: undefined, status: undefined, pagina: 1 })
    expect(lerFiltros({ pagina: 'abc' }).pagina).toBe(1)
    expect(lerFiltros({ tipo: 'constructor', status: 'toString' })).toMatchObject({ tipo: undefined, status: undefined })
    expect(lerFiltros({ busca: ['a', 'b'] }).busca).toBe('a')
  })
  it('aceita URLSearchParams', () => {
    expect(lerFiltros(new URLSearchParams('busca=9999&status=saiu')))
      .toEqual({ busca: '9999', tipo: undefined, exame: undefined, status: 'saiu', pagina: 1 })
  })
  it('monta a query só com os filtros preenchidos (página opcional)', () => {
    const f = { busca: 'a b', tipo: 'ok', exame: undefined, status: undefined, pagina: 2 }
    expect(queryFiltros(f)).toBe('?busca=a+b&tipo=ok&pagina=2')
    expect(queryFiltros(f, { pagina: 1 })).toBe('?busca=a+b&tipo=ok')
    expect(queryFiltros(f, { semPagina: true })).toBe('?busca=a+b&tipo=ok')
    expect(queryFiltros({ pagina: 1 })).toBe('')
  })
})
