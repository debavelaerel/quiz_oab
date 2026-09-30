import { describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { iniciarSessao } from '@/lib/server/quizService'
import { criarHandlerAnswer } from './route'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
const post = (ip: string, body: unknown) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': ip } })

describe('POST /api/quiz/answer', () => {
  it('grava o snapshot e devolve a etapa', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const r = await criarHandlerAnswer(repo)(post('3.3.3.1', { session_token: sessao.sessionToken, seq: 1, respostas: { situacao: 'formado' }, teste: [] }))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ aceito: true, etapa: 'tentativa' })
  })
  it('422 para token malformado, 404 desconhecido, 422 para resposta inexistente', async () => {
    const repo = criarMemorySessionRepo()
    const h = criarHandlerAnswer(repo)
    expect((await h(post('3.3.3.2', { session_token: 'x', seq: 1, respostas: {}, teste: [] }))).status).toBe(422)
    expect((await h(post('3.3.3.3', { session_token: '00000000-0000-4000-8000-000000000000', seq: 1, respostas: {}, teste: [] }))).status).toBe(404)
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    expect((await h(post('3.3.3.4', { session_token: sessao.sessionToken, seq: 1, respostas: { situacao: 'x' }, teste: [] }))).status).toBe(422)
  })
})
