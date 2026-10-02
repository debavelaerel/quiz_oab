import { describe, expect, it, vi } from 'vitest'
import { DATA_HASH } from '@/lib/oab/dataHash'
import { buscarDiagnosticoHtml, DiagnosticoIndisponivel, gerarDiagnosticoPdf } from './diagnosticoService'

const sessao = {
  codigo: 'QO1.x', nome: 'Maria', diagnosticoToken: 'tok',
  recomendacao: { tipo: 'ok', exame: '48', turma: 90, atalho: null },
} as never

const env = () => { process.env.DIAGNOSTICO_SERVICE_URL = 'http://py'; process.env.DIAGNOSTICO_SERVICE_SECRET = 'seg' }

describe('gerarDiagnosticoPdf', () => {
  it('manda segredo, hash do data.json e a recomendação; devolve a chave do S3', async () => {
    env()
    const f = vi.fn(async () => new Response('%PDF', { status: 200, headers: { 'X-Diagnostico-S3-Key': 'diagnosticos/tok.pdf' } }))
    const r = await gerarDiagnosticoPdf(sessao, { fetch: f as never })
    expect(r.s3Key).toBe('diagnosticos/tok.pdf')
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://py/diagnostico')
    expect((init.headers as Record<string, string>)['X-Diagnostico-Secret']).toBe('seg')
    expect(JSON.parse(init.body as string)).toMatchObject({
      codigo: 'QO1.x', nome: 'Maria', diagnostico_token: 'tok', data_hash: DATA_HASH, recomendacao: { tipo: 'ok', exame: '48', turma: 90 },
    })
  })
  it('sem header de chave = S3 do serviço não configurado: s3Key null', async () => {
    env()
    const f = vi.fn(async () => new Response('%PDF', { status: 200 }))
    expect((await gerarDiagnosticoPdf(sessao, { fetch: f as never })).s3Key).toBeNull()
  })
  it('409 (data.json divergente) e 5xx viram DiagnosticoIndisponivel com a mensagem', async () => {
    env()
    const f = vi.fn(async () => new Response('hash', { status: 409 }))
    await expect(gerarDiagnosticoPdf(sessao, { fetch: f as never })).rejects.toBeInstanceOf(DiagnosticoIndisponivel)
  })
  it('sem URL/segredo configurados: DiagnosticoIndisponivel', async () => {
    delete process.env.DIAGNOSTICO_SERVICE_URL; delete process.env.DIAGNOSTICO_SERVICE_SECRET
    await expect(gerarDiagnosticoPdf(sessao, { fetch: vi.fn() as never })).rejects.toBeInstanceOf(DiagnosticoIndisponivel)
  })
  it('falha de rede vira DiagnosticoIndisponivel', async () => {
    env()
    const f = vi.fn(async () => { throw new Error('ECONNREFUSED') })
    await expect(gerarDiagnosticoPdf(sessao, { fetch: f as never })).rejects.toBeInstanceOf(DiagnosticoIndisponivel)
  })
})

describe('buscarDiagnosticoHtml', () => {
  it('chama /diagnostico/html com segredo, hash e recomendação e devolve o html', async () => {
    env()
    const f = vi.fn(async () => new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    const r = await buscarDiagnosticoHtml(sessao, { fetch: f as never })
    expect(r).toEqual({ html: '<html>ok</html>' })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://py/diagnostico/html')
    expect((init.headers as Record<string, string>)['X-Diagnostico-Secret']).toBe('seg')
    expect(JSON.parse(init.body as string)).toMatchObject({ codigo: 'QO1.x', data_hash: DATA_HASH, recomendacao: { tipo: 'ok', exame: '48', turma: 90 } })
  })
  it('sessão sem código ou recomendação: erro sem chamar o serviço', async () => {
    env()
    const f = vi.fn()
    const r = await buscarDiagnosticoHtml({ ...(sessao as object), codigo: null } as never, { fetch: f as never })
    expect('erro' in r).toBe(true)
    expect(f).not.toHaveBeenCalled()
  })
  it('409, 500, rede e URL ausente viram { erro } sem vazar o segredo', async () => {
    env()
    for (const f of [
      vi.fn(async () => new Response('hash', { status: 409 })),
      vi.fn(async () => new Response('x', { status: 500 })),
      vi.fn(async () => { throw new Error('ECONNREFUSED') }),
    ]) {
      const r = await buscarDiagnosticoHtml(sessao, { fetch: f as never })
      expect('erro' in r && r.erro).toBeTruthy()
      expect(JSON.stringify(r)).not.toContain('seg')
      expect(JSON.stringify(r)).not.toMatch(/recrie o container/) // 409 também ocorre quando só a recomendação diverge
    }
    delete process.env.DIAGNOSTICO_SERVICE_URL
    expect('erro' in (await buscarDiagnosticoHtml(sessao, { fetch: vi.fn() as never }))).toBe(true)
  })
})
