import { describe, expect, it } from 'vitest'
import { urlBase } from './adminUrl'

describe('urlBase (link público colado fora do admin)', () => {
  it('APP_URL tem prioridade e perde a barra final', () => {
    expect(urlBase('https://quiz.vde.com.br/', 'interno.railway.app')).toBe('https://quiz.vde.com.br')
  })
  it('sem APP_URL usa o host: http só para localhost/127.x/::1, https no resto', () => {
    expect(urlBase(undefined, 'localhost:3100')).toBe('http://localhost:3100')
    expect(urlBase('', '127.0.0.1:3000')).toBe('http://127.0.0.1:3000')
    expect(urlBase(undefined, 'quiz.vde.com.br')).toBe('https://quiz.vde.com.br')
  })
  it('host que só começa com "localhost" NÃO é local', () => {
    expect(urlBase(undefined, 'localhost.evil.com')).toBe('https://localhost.evil.com')
    expect(urlBase(undefined, '127.evil.com')).toBe('https://127.evil.com')
  })
  it('sem nada → vazio', () => expect(urlBase(undefined, null)).toBe(''))
})
