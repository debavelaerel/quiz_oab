import { describe, expect, it, vi } from 'vitest'
import { DiagnosticoIndisponivel } from '@/lib/server/diagnosticoService'
import { leadConcluido, reqAdmin, SEGREDO_TESTE } from '@/lib/server/adminTestUtil'
import { criarHandlerRegenerar } from './route'

const post = (o: { logado?: boolean; form?: boolean } = {}) => reqAdmin('http://x', { method: 'POST', ...o })
const deps = (repo: never, extra: object = {}) => ({
  repo, segredo: SEGREDO_TESTE, gerar: async () => ({ s3Key: 'k.pdf' }), ...extra,
})

describe('POST /api/admin/leads/[token]/regenerar', () => {
  it('regenera a partir de erro e termina em pronto (sem enviar e-mail)', async () => {
    const { repo, s, params } = await leadConcluido()
    const r = await criarHandlerRegenerar(deps(repo as never))(post(), params)
    expect(r.status).toBe(200)
    expect((await r.json()).status).toBe('pronto')
    const depois = (await repo.buscarPorDiagnosticoToken(s.diagnosticoToken))!
    expect(depois.diagnosticoPdfS3Key).toBe('k.pdf')
    expect(depois.diagnosticoPdfErro).toBeNull()
    expect(depois.emailEnviadoEm).toBeNull()
  })
  it('serviço de PDF fora do ar: termina em erro, sem lançar (200 com status erro)', async () => {
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'erro' })
    const gerar = async () => { throw new DiagnosticoIndisponivel('ECONNREFUSED') }
    const r = await criarHandlerRegenerar(deps(repo as never, { gerar }))(post(), params)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ status: 'erro' })
  })
  it('pendente recente (<60s): 409 sem chamar gerar (já está sendo gerado); form recebe o aviso', async () => {
    const agora = new Date('2026-09-30T12:00:30.000Z')
    const { repo, s, params } = await leadConcluido({ diagnosticoStatus: 'pendente', diagnosticoSolicitadoEm: '2026-09-30T12:00:00.000Z' })
    const gerar = vi.fn()
    const r = await criarHandlerRegenerar(deps(repo as never, { gerar, agora: () => agora }))(post(), params)
    expect(r.status).toBe(409)
    expect((await r.json()).erro).toBe('o diagnóstico já está sendo gerado')
    expect(gerar).not.toHaveBeenCalled()
    const f = await criarHandlerRegenerar(deps(repo as never, { gerar, agora: () => agora }))(post({ form: true }), params)
    expect(f.headers.get('location')).toBe(`http://x/admin/leads/${s.diagnosticoToken}?aviso=regenerar-em-andamento`)
  })
  it('pendente com mais de 60s: pode regenerar', async () => {
    const agora = new Date('2026-09-30T12:01:01.000Z')
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'pendente', diagnosticoSolicitadoEm: '2026-09-30T12:00:00.000Z' })
    const r = await criarHandlerRegenerar(deps(repo as never, { agora: () => agora }))(post(), params)
    expect(r.status).toBe(200)
    expect((await r.json()).status).toBe('pronto')
  })
  it('vale para desligado', async () => {
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'desligado' })
    expect((await (await criarHandlerRegenerar(deps(repo as never))(post(), params)).json()).status).toBe('pronto')
  })
  it('409 para nao_se_aplica e para pronto; nunca chama gerar', async () => {
    for (const st of ['nao_se_aplica', 'pronto'] as const) {
      const { repo, params } = await leadConcluido({ diagnosticoStatus: st })
      const gerar = vi.fn()
      const r = await criarHandlerRegenerar(deps(repo as never, { gerar }))(post(), params)
      expect(r.status).toBe(409)
      expect(gerar).not.toHaveBeenCalled()
    }
  })
  it('form HTML: 303 de volta para o detalhe com o aviso', async () => {
    const { repo, s, params } = await leadConcluido()
    const r = await criarHandlerRegenerar(deps(repo as never))(post({ form: true }), params)
    expect(r.status).toBe(303)
    expect(r.headers.get('location')).toBe(`http://x/admin/leads/${s.diagnosticoToken}?aviso=regenerar-pronto`)
  })
  it('sem sessão: 401; token inválido/inexistente: 404', async () => {
    const { repo, params } = await leadConcluido()
    expect((await criarHandlerRegenerar(deps(repo as never))(post({ logado: false }), params)).status).toBe(401)
    const p = (token: string) => ({ params: Promise.resolve({ token }) })
    expect((await criarHandlerRegenerar(deps(repo as never))(post(), p('nao-uuid'))).status).toBe(404)
    expect((await criarHandlerRegenerar(deps(repo as never))(post(), p('00000000-0000-4000-8000-000000000000'))).status).toBe(404)
  })
})
