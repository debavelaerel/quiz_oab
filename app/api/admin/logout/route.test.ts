import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NOME_COOKIE_ADMIN } from '@/lib/server/adminAuth'
import { reqAdmin, SEGREDO_TESTE } from '@/lib/server/adminTestUtil'
import { POST } from './route'

describe('POST /api/admin/logout', () => {
  let antes: string | undefined
  beforeEach(() => { antes = process.env.ADMIN_SESSION_SECRET; process.env.ADMIN_SESSION_SECRET = SEGREDO_TESTE })
  afterEach(() => { if (antes === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = antes })

  it('sem cookie: 401 e não mexe no cookie', async () => {
    const r = await POST(reqAdmin('http://x', { method: 'POST', logado: false }))
    expect(r.status).toBe(401)
    expect(r.headers.get('set-cookie')).toBeNull()
  })
  it('com cookie válido: 200 e apaga o cookie (Max-Age=0)', async () => {
    const r = await POST(reqAdmin('http://x', { method: 'POST' }))
    expect(r.status).toBe(200)
    const sc = r.headers.get('set-cookie') ?? ''
    expect(sc).toContain(`${NOME_COOKIE_ADMIN}=;`)
    expect(sc).toMatch(/Max-Age=0/i)
    expect(sc).toMatch(/HttpOnly/i)
  })
})
