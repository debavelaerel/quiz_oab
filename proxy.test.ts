import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { assinarSessao, NOME_COOKIE_ADMIN } from '@/lib/server/adminAuth'
import { config, proxy } from './proxy'

const SEGREDO = 'segredo-de-teste-bem-comprido-0123456789'
const req = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'http://localhost'), { headers: cookie ? { cookie: `${NOME_COOKIE_ADMIN}=${cookie}` } : {} })

describe('proxy do admin', () => {
  let antes: string | undefined
  beforeEach(() => { antes = process.env.ADMIN_SESSION_SECRET; process.env.ADMIN_SESSION_SECRET = SEGREDO })
  afterEach(() => { if (antes === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = antes })

  it('matcher cobre /admin e /api/admin (com e sem subcaminho)', () => {
    expect(config.matcher).toEqual(['/admin', '/admin/:path*', '/api/admin/:path*'])
  })
  it('login (página e API) é público', () => {
    expect(proxy(req('/admin/login')).headers.get('x-middleware-next')).toBe('1')
    expect(proxy(req('/api/admin/login')).headers.get('x-middleware-next')).toBe('1')
  })
  it('sem cookie: páginas redirecionam ao login com ?proximo; API responde 401', async () => {
    for (const p of ['/admin', '/admin/leads', '/admin/leads/abc']) {
      const r = proxy(req(p))
      expect(r.status).toBe(307)
      const destino = new URL(r.headers.get('location')!)
      expect(destino.pathname).toBe('/admin/login')
      expect(destino.searchParams.get('proximo')).toBe(p)
    }
    for (const p of ['/api/admin/export', '/api/admin/logout', '/api/admin/leads/x/regenerar']) {
      const r = proxy(req(p))
      expect(r.status).toBe(401)
    }
  })
  it('cookie inválido ou segredo ausente: nega', () => {
    expect(proxy(req('/api/admin/export', 'lixo.123')).status).toBe(401)
    const valido = assinarSessao(SEGREDO)
    delete process.env.ADMIN_SESSION_SECRET
    expect(proxy(req('/api/admin/export', valido)).status).toBe(401)
  })
  it('cookie válido: passa', () => {
    const valido = assinarSessao(SEGREDO)
    expect(proxy(req('/admin/leads', valido)).headers.get('x-middleware-next')).toBe('1')
    expect(proxy(req('/api/admin/export', valido)).headers.get('x-middleware-next')).toBe('1')
  })
})
