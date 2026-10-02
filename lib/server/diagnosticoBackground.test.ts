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
  it('sucesso: pronto e chave gravada, SEM enviar e-mail ao lead (o time manda pelo WhatsApp)', async () => {
    const { repo, sessao } = await sessaoPendente()
    await gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => ({ s3Key: 'k.pdf' }) })
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    expect(s).toMatchObject({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'k.pdf', diagnosticoPdfErro: null })
    expect(s.emailEnviadoEm).toBeNull()
    expect(s.emailErro).toBeNull()
  })
  it('falha do serviço: erro gravado e nada relançado', async () => {
    const { repo, sessao } = await sessaoPendente()
    await expect(gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => { throw new DiagnosticoIndisponivel('fora do ar') } })).resolves.toBeUndefined()
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    expect(s.diagnosticoStatus).toBe('erro')
    expect(s.diagnosticoPdfErro).toContain('fora do ar')
  })
  it('nunca lança nem quando o repositório falha ao gravar', async () => {
    const { repo, sessao } = await sessaoPendente()
    const quebrado = { ...repo, atualizar: async () => { throw new Error('db fora') } } as never
    await expect(gerarEArmazenarDiagnostico(quebrado, sessao, { gerar: async () => { throw new Error('x') } })).resolves.toBeUndefined()
    await expect(gerarEArmazenarDiagnostico(quebrado, sessao, { gerar: async () => ({ s3Key: 'k' }) })).resolves.toBeUndefined()
  })
  it('S3 do serviço não configurado: desligado', async () => {
    const { repo, sessao } = await sessaoPendente()
    await gerarEArmazenarDiagnostico(repo, sessao, { gerar: async () => ({ s3Key: null }) })
    expect((await repo.buscarPorToken(sessao.sessionToken))!.diagnosticoStatus).toBe('desligado')
  })
})
