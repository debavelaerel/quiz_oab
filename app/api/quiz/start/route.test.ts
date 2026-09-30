import { describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { criarHandlerStart } from './route'

const req = (body: unknown) =>
  new Request('http://x/api/quiz/start', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': '1.1.1.1' } })

describe('POST /api/quiz/start', () => {
  it('cria sessão com hoje do servidor e grava UTM', async () => {
    const repo = criarMemorySessionRepo()
    const h = criarHandlerStart({ repo, agora: () => new Date('2026-09-30T12:00:00Z'), permitirOverride: false })
    const r = await h(req({ utm: { source: 'ig', campaign: 'oab' } }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.hoje).toBe('2026-09-30')
    expect(j.retomada).toBe(false)
    expect(repo.todas()[0].utmSource).toBe('ig')
  })
  it('ignora hoje_override sem a flag; aceita com a flag', async () => {
    const repo = criarMemorySessionRepo()
    const sem = criarHandlerStart({ repo, agora: () => new Date('2026-09-30T12:00:00Z'), permitirOverride: false })
    expect((await (await sem(req({ hoje_override: '2027-01-15' }))).json()).hoje).toBe('2026-09-30')
    const com = criarHandlerStart({ repo, agora: () => new Date('2026-09-30T12:00:00Z'), permitirOverride: true })
    expect((await (await com(req({ hoje_override: '2027-01-15' }))).json()).hoje).toBe('2027-01-15')
  })
  it('400 para JSON inválido', async () => {
    const h = criarHandlerStart({ repo: criarMemorySessionRepo(), agora: () => new Date(), permitirOverride: false })
    const r = await h(new Request('http://x', { method: 'POST', body: '{', headers: { 'x-forwarded-for': '2.2.2.2' } }))
    expect(r.status).toBe(400)
  })
})
