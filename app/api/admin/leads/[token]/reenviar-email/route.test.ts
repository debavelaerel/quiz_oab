import { describe, expect, it, vi } from 'vitest'
import { leadConcluido, reqAdmin, SEGREDO_TESTE } from '@/lib/server/adminTestUtil'
import { criarHandlerReenviarEmail } from './route'

const post = (o: { logado?: boolean; form?: boolean } = {}) => reqAdmin('http://x', { method: 'POST', ...o })

describe('POST /api/admin/leads/[token]/reenviar-email', () => {
  it('pronto: envia com o link público e grava email_enviado_em', async () => {
    const { repo, s, params } = await leadConcluido({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'k.pdf', emailErro: 'antigo' })
    const enviar = vi.fn(async () => ({ enviado: true }))
    const r = await criarHandlerReenviarEmail({ repo, segredo: SEGREDO_TESTE, enviar, linkBase: 'https://quiz.test/' })(post(), params)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ enviado: true })
    expect(enviar).toHaveBeenCalledWith({ nome: 'A', email: 'a@b.com' }, `https://quiz.test/api/diagnostico/${s.diagnosticoToken}`)
    const d = (await repo.buscarPorDiagnosticoToken(s.diagnosticoToken))!
    expect(d.emailEnviadoEm).not.toBeNull()
    expect(d.emailErro).toBeNull()
  })
  it('falha no envio (retorno ou exceção) grava email_erro', async () => {
    const a = await leadConcluido({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'k.pdf' })
    const r1 = await criarHandlerReenviarEmail({ repo: a.repo, segredo: SEGREDO_TESTE, enviar: async () => ({ enviado: false, motivo: 'smtp_desligado' }) })(post(), a.params)
    expect(await r1.json()).toEqual({ enviado: false, motivo: 'smtp_desligado' })
    expect((await a.repo.buscarPorDiagnosticoToken(a.s.diagnosticoToken))!.emailErro).toBe('smtp_desligado')
    const b = await leadConcluido({ diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'k.pdf' })
    const r2 = await criarHandlerReenviarEmail({ repo: b.repo, segredo: SEGREDO_TESTE, enviar: async () => { throw new Error('boom') } })(post({ form: true }), b.params)
    expect(r2.status).toBe(303)
    expect(r2.headers.get('location')).toContain('aviso=email-falhou')
    expect((await b.repo.buscarPorDiagnosticoToken(b.s.diagnosticoToken))!.emailErro).toContain('boom')
  })
  it('409 se o diagnóstico não está pronto; 401 sem sessão', async () => {
    const { repo, params } = await leadConcluido({ diagnosticoStatus: 'erro' })
    const enviar = vi.fn()
    expect((await criarHandlerReenviarEmail({ repo, segredo: SEGREDO_TESTE, enviar })(post(), params)).status).toBe(409)
    expect((await criarHandlerReenviarEmail({ repo, segredo: SEGREDO_TESTE, enviar })(post({ logado: false }), params)).status).toBe(401)
    expect(enviar).not.toHaveBeenCalled()
  })
})
