import { describe, expect, it } from 'vitest'
import { destinoSeguro } from './adminRedirect'

const PADRAO = '/admin/leads'

describe('destinoSeguro (pós-login)', () => {
  it('aceita caminhos internos do admin, preservando a query', () => {
    expect(destinoSeguro('/admin/leads?busca=a')).toBe('/admin/leads?busca=a')
    expect(destinoSeguro('/admin/leads/aaaaaaaa-1111-1111-1111-111111111111')).toBe('/admin/leads/aaaaaaaa-1111-1111-1111-111111111111')
    expect(destinoSeguro('/admin')).toBe('/admin')
  })
  it('vazio, null ou undefined: padrão', () => {
    for (const v of ['', null, undefined]) expect(destinoSeguro(v)).toBe(PADRAO)
  })
  it('recusa TAB/LF/CR e outros caracteres de controle (o parser de URL os remove)', () => {
    for (const v of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/\x00/evil.com', '/\x7f/evil.com', '/admin/\tleads']) {
      expect(destinoSeguro(v)).toBe(PADRAO)
    }
  })
  it('recusa variantes codificadas que, decodificadas, viram host externo', () => {
    // Chegam decodificadas por searchParams.get; também conferimos a forma literal.
    for (const v of ['/%09/evil.com', '/%0a/evil.com', '/%0d/evil.com', '/%2F/evil.com', '%2F%2Fevil.com']) {
      expect(destinoSeguro(v)).toBe(PADRAO)
    }
    const decodificado = new URLSearchParams('proximo=/%09/evil.com').get('proximo')
    expect(destinoSeguro(decodificado)).toBe(PADRAO)
  })
  it('recusa host externo, protocol-relative, barra invertida, esquemas e fuga do /admin', () => {
    for (const v of ['//evil.com', '/\\evil.com', '\\\\evil.com', 'https://evil.com', 'http://evil.com/admin',
      'javascript:alert(1)', '/admin/../evil', '/administrator', '/', 'admin/leads', '/admin/login', '/admin/login?proximo=/x']) {
      expect(destinoSeguro(v)).toBe(PADRAO)
    }
  })
})
