import { describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { iniciarSessao } from '@/lib/server/quizService'
import { criarHandlerWhatsapp } from './route'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
const post = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/quiz/whatsapp', () => {
  it('204 e registra o clique; 204 também para token inválido', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const h = criarHandlerWhatsapp(repo)
    const r = await h(post({ session_token: sessao.sessionToken }))
    expect(r.status).toBe(204)
    expect((await repo.buscarPorToken(sessao.sessionToken))!.whatsappClicadoEm).not.toBeNull()
    expect((await h(post({ session_token: 'x' }))).status).toBe(204)
  })
})
