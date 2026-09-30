import { describe, expect, it } from 'vitest'
import { leadConcluido, reqAdmin, SEGREDO_TESTE } from '@/lib/server/adminTestUtil'
import { criarHandlerPdfAdmin } from './route'

const assinar = async (k: string) => `https://s3/${k}?sig`
const agora = () => new Date()

describe('GET /api/admin/leads/[token]/pdf', () => {
  it('pronto: 302 para a URL assinada', async () => {
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'd/a.pdf' })
    const r = await criarHandlerPdfAdmin({ repo, segredo: SEGREDO_TESTE, assinar, agora })(reqAdmin(), params)
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('https://s3/d/a.pdf?sig')
  })
  it('assinar rejeitando: 503 JSON', async () => {
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'd/a.pdf' })
    const r = await criarHandlerPdfAdmin({ repo, segredo: SEGREDO_TESTE, assinar: async () => { throw new Error('sem bucket') }, agora })(reqAdmin(), params)
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ erro: 'serviço de diagnóstico indisponível' })
  })
  it('erro/pendente: 425; nao_se_aplica/desligado: 404; sem sessão: 401', async () => {
    for (const [st, esperado] of [['erro', 425], ['pendente', 425], ['nao_se_aplica', 404], ['desligado', 404]] as const) {
      const { repo, params } = await leadConcluido({ diagnosticoStatus: st })
      expect((await criarHandlerPdfAdmin({ repo, segredo: SEGREDO_TESTE, assinar, agora })(reqAdmin(), params)).status).toBe(esperado)
    }
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'd/a.pdf' })
    expect((await criarHandlerPdfAdmin({ repo, segredo: SEGREDO_TESTE, assinar, agora })(reqAdmin('http://x', { logado: false }), params)).status).toBe(401)
  })
})
