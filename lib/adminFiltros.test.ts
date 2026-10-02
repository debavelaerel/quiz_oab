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
    expect(lerFiltros({ pagina: '99999999999' }).pagina).toBe(10_000)
    expect(lerFiltros({ tipo: 'constructor', status: 'toString' })).toMatchObject({ tipo: undefined, status: undefined })
    expect(lerFiltros({ busca: ['a', 'b'] }).busca).toBe('a')
  })
  it('busca por referência: tira o # (como na mensagem do WhatsApp) e põe em maiúsculas', () => {
    expect(lerFiltros({ busca: '#K7F2' }).busca).toBe('K7F2')
    expect(lerFiltros({ busca: ' #k7f2 ' }).busca).toBe('K7F2')
    expect(lerFiltros({ busca: '# k7f2' }).busca).toBe('K7F2')
    expect(lerFiltros({ busca: 'K7F2' }).busca).toBe('K7F2')
    expect(lerFiltros(new URLSearchParams('busca=%23K7F2')).busca).toBe('K7F2')
  })
  it('texto com # que não tem forma de referência fica como digitado, sem o #', () => {
    expect(lerFiltros({ busca: '#maria silva' }).busca).toBe('maria silva')
    expect(lerFiltros({ busca: '#k0f1' }).busca).toBe('k0f1') // 0 e 1 não existem no alfabeto da ref
    expect(lerFiltros({ busca: 'ana' }).busca).toBe('ana')
    expect(lerFiltros({ busca: '#' }).busca).toBeUndefined()
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

describe('filtro de diagnóstico', () => {
  it('aceita um status válido e ignora lixo (inclusive chaves herdadas)', () => {
    expect(lerFiltros({ diagnostico: 'erro' }).diagnostico).toBe('erro')
    expect(lerFiltros({ diagnostico: 'constructor' }).diagnostico).toBeUndefined()
    expect(lerFiltros({ diagnostico: 'x' }).diagnostico).toBeUndefined()
  })
  it('entra na query (paginação e CSV repassam)', () => {
    expect(queryFiltros({ diagnostico: 'erro', pagina: 1 })).toBe('?diagnostico=erro')
  })
})
