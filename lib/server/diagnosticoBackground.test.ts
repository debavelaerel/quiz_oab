import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarMemorySessionRepo } from './memorySessionRepo'
import { DiagnosticoIndisponivel } from './diagnosticoService'
import { gerarEArmazenarDiagnostico } from './diagnosticoBackground'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
async function sessaoPendente() {
  const repo = criarMemorySessionRepo()
  const s = await repo.criar({ hoje: '2026-09-30', utm: UTM })
  const c = await repo.concluir(s.id, {
    nome: 'Maria', email: 'm@x.com', codigo: 'QO1.x', tipo: 'ok', diagnosticoStatus: 'pendente',
    diagnosticoSolicitadoEm: new Date().toISOString(), recomendacao: { tipo: 'ok', exame: '48', turma: 90, atalho: null },
  })
  return { repo, sessao: c! }
}

describe('gerarEArmazenarDiagnostico', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined) })
  it('sucesso: pronto, chave gravada e e-mail enviado', async () => {
    const { repo, sessao } = await sessaoPendente()
    const enviar = vi.fn(async () => ({ enviado: true }))
    await gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => ({ s3Key: 'k.pdf' }), enviar, linkBase: 'http://app' })
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    expect(s).toMatchObject({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'k.pdf', diagnosticoPdfErro: null })
    expect(s.emailEnviadoEm).not.toBeNull()
    expect((enviar.mock.calls[0] as unknown[])[1]).toBe(`http://app/api/diagnostico/${sessao.diagnosticoToken}`)
  })
  it('falha do serviço: erro gravado e nada relançado', async () => {
    const { repo, sessao } = await sessaoPendente()
    await expect(gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => { throw new DiagnosticoIndisponivel('fora do ar') }, enviar: vi.fn(), linkBase: 'http://app' })).resolves.toBeUndefined()
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    expect(s.diagnosticoStatus).toBe('erro')
    expect(s.diagnosticoPdfErro).toContain('fora do ar')
  })
  it('sessão sem e-mail: pronto, sem envio', async () => {
    const { repo, sessao } = await sessaoPendente()
    const enviar = vi.fn()
    await gerarEArmazenarDiagnostico(repo, { ...sessao, email: null }, { gerar: async () => ({ s3Key: 'k.pdf' }), enviar, linkBase: 'http://app' })
    expect((await repo.buscarPorToken(sessao.sessionToken))!.diagnosticoStatus).toBe('pronto')
    expect(enviar).not.toHaveBeenCalled()
  })
  it('nunca lança nem quando o repositório falha ao gravar o erro', async () => {
    const { repo, sessao } = await sessaoPendente()
    const quebrado = { ...repo, atualizar: async () => { throw new Error('db fora') } } as never
    await expect(gerarEArmazenarDiagnostico(quebrado, sessao, { gerar: async () => { throw new Error('x') }, enviar: vi.fn(), linkBase: 'http://app' })).resolves.toBeUndefined()
    await expect(gerarEArmazenarDiagnostico(quebrado, sessao, { gerar: async () => ({ s3Key: 'k' }), enviar: vi.fn(), linkBase: 'http://app' })).resolves.toBeUndefined()
  })
  it('S3 do serviço não configurado: desligado, sem e-mail', async () => {
    const { repo, sessao } = await sessaoPendente()
    const enviar = vi.fn()
    await gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => ({ s3Key: null }), enviar, linkBase: 'http://app' })
    expect((await repo.buscarPorToken(sessao.sessionToken))!.diagnosticoStatus).toBe('desligado')
    expect(enviar).not.toHaveBeenCalled()
  })
  it('falha no e-mail não derruba o diagnóstico', async () => {
    const { repo, sessao } = await sessaoPendente()
    await gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => ({ s3Key: 'k.pdf' }), enviar: async () => { throw new Error('smtp caiu') }, linkBase: 'http://app' })
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    expect(s.diagnosticoStatus).toBe('pronto')
    expect(s.emailErro).toContain('smtp caiu')
  })
})
