import { describe, expect, it, vi } from 'vitest'
import { DATA_HASH } from '@/lib/oab/dataHash'
import { DiagnosticoIndisponivel, gerarDiagnosticoPdf } from './diagnosticoService'

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
