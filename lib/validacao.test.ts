import { describe, it, expect } from 'vitest'
import { nomeValido, nomeCurtoValido, emailValido, whatsappValido } from './validacao'

describe('nomeValido', () => {
  it('nome e sobrenome: válido', () => {
    expect(nomeValido('Maria Silva')).toBe(true)
    expect(nomeValido('  Maria   Silva  ')).toBe(true)
  })
  it('nome de três ou mais palavras: válido', () => {
    expect(nomeValido('Maria da Silva')).toBe(true)
  })
  it('só um nome: inválido', () => {
    expect(nomeValido('Maria')).toBe(false)
  })
  it('vazio ou só espaço: inválido', () => {
    expect(nomeValido('')).toBe(false)
    expect(nomeValido('   ')).toBe(false)
  })
  it('nome gigante (>200 chars): inválido', () => {
    expect(nomeValido(`${'A '.repeat(150)}B`)).toBe(false)
  })
  it('nome de exatamente 200 chars: ainda válido', () => {
    const nome = `Maria ${'A'.repeat(200 - 'Maria '.length)}`
    expect(nome).toHaveLength(200)
    expect(nomeValido(nome)).toBe(true)
  })
})

describe('emailValido', () => {
  it('formato padrão: válido', () => {
    expect(emailValido('maria@exemplo.com')).toBe(true)
    expect(emailValido('maria.silva+teste@sub.exemplo.com.br')).toBe(true)
  })
  it('sem @: inválido', () => {
    expect(emailValido('mariaexemplo.com')).toBe(false)
  })
  it('sem domínio/tld: inválido', () => {
    expect(emailValido('maria@exemplo')).toBe(false)
  })
  it('tld de 1 letra: inválido', () => {
    expect(emailValido('maria@exemplo.c')).toBe(false)
  })
  it('com espaço: inválido', () => {
    expect(emailValido('maria @exemplo.com')).toBe(false)
  })
  it('gigante (>254 chars): inválido mesmo com formato correto', () => {
    const localPart = 'a'.repeat(250)
    expect(emailValido(`${localPart}@x.com`)).toBe(false)
  })
})

describe('whatsappValido', () => {
  it('11 dígitos (DDD + celular com 9º dígito): válido', () => {
    expect(whatsappValido('11987654321')).toBe(true)
  })
  it('formatado com parênteses/espaço/traço: válido, conta só os dígitos', () => {
    expect(whatsappValido('(11) 98765-4321')).toBe(true)
  })
  it('com +55 na frente (13 dígitos): válido, ignora o código do país', () => {
    expect(whatsappValido('+55 11 98765-4321')).toBe(true)
  })
  it('10 dígitos (sem o 9º dígito): inválido', () => {
    expect(whatsappValido('1187654321')).toBe(false)
  })
  it('menos de 10 dígitos: inválido', () => {
    expect(whatsappValido('123')).toBe(false)
  })
  it('mais de 11 dígitos sem ser +55: inválido', () => {
    expect(whatsappValido('119876543210')).toBe(false)
  })
  it('DDD inexistente: inválido mesmo com 11 dígitos', () => {
    for (const ddd of ['00', '10', '20', '23', '25', '26', '29', '30', '36', '39', '40', '50', '52', '56', '60', '70', '72', '76', '78', '80', '90']) {
      expect(whatsappValido(`${ddd}987654321`), ddd).toBe(false)
    }
    expect(whatsappValido('+55 (23) 98765-4321')).toBe(false)
  })
  it('todo DDD brasileiro existente: válido (com e sem +55)', () => {
    const ddds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
      41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
      71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99]
    for (const ddd of ddds) {
      expect(whatsappValido(`(${ddd}) 98765-4321`), String(ddd)).toBe(true)
      expect(whatsappValido(`+55 ${ddd} 98765-4321`), `+55 ${ddd}`).toBe(true)
    }
  })
})

describe('nomeCurtoValido (primeiro nome ou apelido)', () => {
  it.each(['Ma', 'Maria', ' Zé ', 'João Pedro', 'Ana-Clara'])('aceita %p', (n) => expect(nomeCurtoValido(n)).toBe(true))
  it.each(['', ' ', 'A', '12', '1a', '😀😀', 'x'.repeat(81), 'Ma\nria', 'Ma\tria', 'Maria\u202E'])('recusa %p', (n) => expect(nomeCurtoValido(n)).toBe(false))
})
