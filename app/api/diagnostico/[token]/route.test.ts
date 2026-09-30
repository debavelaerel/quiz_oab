import { describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { criarHandlerDiagnostico } from './route'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
async function com(status: string | null, extra: object = {}) {
  const repo = criarMemorySessionRepo()
  const s = await repo.criar({ hoje: '2026-09-30', utm: UTM })
  await repo.atualizar(s.id, { status: 'concluido', diagnosticoStatus: status as never, diagnosticoSolicitadoEm: new Date().toISOString(), ...extra })
  return { repo, token: s.diagnosticoToken }
}
const chama = (repo: never, token: string) =>
  criarHandlerDiagnostico({ repo, assinar: async (k: string) => `https://s3/${k}?sig`, agora: () => new Date() })(new Request('http://x'), { params: Promise.resolve({ token }) })

describe('GET /api/diagnostico/[token]', () => {
  it('pronto: 302 para a URL assinada, sem cache e com noindex', async () => {
    const { repo, token } = await com('pronto', { diagnosticoPdfS3Key: 'diagnosticos/a.pdf' })
    const r = await chama(repo as never, token)
    expect(r.status).toBe(302)
    expect(r.headers.get('Location')).toBe('https://s3/diagnosticos/a.pdf?sig')
    expect(r.headers.get('Cache-Control')).toContain('no-store')
    expect(r.headers.get('X-Robots-Tag')).toContain('noindex')
  })
  it('pendente 425; erro 425 sem vazar o erro; nao_se_aplica 404; desligado 503', async () => {
    const p = await com('pendente')
    expect((await chama(p.repo as never, p.token)).status).toBe(425)
    const e = await com('erro', { diagnosticoPdfErro: 'segredo interno: ECONNREFUSED' })
    const re = await chama(e.repo as never, e.token)
    expect(re.status).toBe(425)
    const txt = await re.text()
    expect(JSON.parse(txt)).toEqual({ erro: 'ainda não está pronto, tente em instantes' })
    expect(txt).not.toContain('ECONNREFUSED')
    expect(re.headers.get('Cache-Control')).toContain('no-store')
    const n = await com('nao_se_aplica')
    expect((await chama(n.repo as never, n.token)).status).toBe(404)
    const d = await com('desligado')
    expect((await chama(d.repo as never, d.token)).status).toBe(503)
  })
  it('token inexistente ou malformado: 404', async () => {
    const repo = criarMemorySessionRepo()
    expect((await chama(repo as never, 'nao-e-uuid')).status).toBe(404)
    expect((await chama(repo as never, '00000000-0000-4000-8000-000000000000')).status).toBe(404)
  })
})
