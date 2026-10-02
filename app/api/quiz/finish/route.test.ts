import { describe, expect, it, vi } from 'vitest'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { iniciarSessao } from '@/lib/server/quizService'
import { criarHandlerFinish } from './route'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
const RESP = {
  situacao: 'formado', tentativa: 'nunca', nivel: 'b1', metodo: 'zero', trava: 'materiais', motivo: 'advocacia',
  compromisso: 'bastante', trabalho: 'estagio', rotina: 'nada', horas: 'h3', vde: 'insta', investir: 'parcela', parcela: 'p80',
}
const corpo = (token: string) => ({
  session_token: token, respostas: RESP, teste: ['C', 'B', 'A', 'X', 'A'],
  nome: 'Maria', contato: { email: 'maria@exemplo.com', whatsapp: '(85) 99999-0000' }, consentimento: true,
})
const post = (ip: string, body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': ip } })

describe('POST /api/quiz/finish', () => {
  it('responde 200 e agenda o diagnóstico uma única vez, mesmo com duplo clique', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const agendar = vi.fn()
    const h = criarHandlerFinish({ repo, agendar })
    const [a, b] = await Promise.all([h(post('4.4.4.1', corpo(sessao.sessionToken))), h(post('4.4.4.1', corpo(sessao.sessionToken)))])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(agendar.mock.calls.length).toBeLessThanOrEqual(1)
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    if (s.diagnosticoStatus === 'pendente') expect(agendar).toHaveBeenCalledTimes(1)
  })
  it('422 com contato inválido; nunca agenda', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const agendar = vi.fn()
    const r = await criarHandlerFinish({ repo, agendar })(post('4.4.4.2', { ...corpo(sessao.sessionToken), contato: { email: 'x', whatsapp: '1' } }))
    expect(r.status).toBe(422)
    expect(agendar).not.toHaveBeenCalled()
  })
  it('422 com campos [nome] quando não há nome nem na sessão nem no corpo', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const { nome: _n, ...semNome } = corpo(sessao.sessionToken)
    const agendar = vi.fn()
    const r = await criarHandlerFinish({ repo, agendar })(post('4.4.4.9', semNome))
    expect(r.status).toBe(422)
    expect((await r.json()).campos).toEqual(['nome'])
    expect(agendar).not.toHaveBeenCalled()
    expect((await repo.buscarPorToken(sessao.sessionToken))!.status).toBe('em_andamento')
  })
  it('payload legado (contato.nome_completo, sem nome): 200 e grava o primeiro nome', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const { nome: _n, contato, ...resto } = corpo(sessao.sessionToken)
    const r = await criarHandlerFinish({ repo, agendar: vi.fn() })(post('4.4.4.8', { ...resto, contato: { ...contato, nome_completo: 'Maria Souza' } }))
    expect(r.status).toBe(200)
    expect((await repo.buscarPorToken(sessao.sessionToken))!.nome).toBe('Maria')
  })
  it('agenda exatamente uma vez numa conclusão simples e não vaza PII na resposta', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const agendar = vi.fn()
    const r = await criarHandlerFinish({ repo, agendar })(post('4.4.4.3', corpo(sessao.sessionToken)))
    const txt = await r.text()
    expect(r.status).toBe(200)
    expect(txt).not.toContain('@')
    expect(txt).not.toContain('99999')
    expect(txt).not.toContain('diagnosticoToken')
    const s = (await repo.buscarPorToken(sessao.sessionToken))!
    expect(agendar).toHaveBeenCalledTimes(s.tipo && ['ok', 'acima', 'sem_turma'].includes(s.tipo) ? 1 : 0)
  })
  it('a tarefa agendada nunca rejeita, mesmo que a geração falhe', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    const tarefas: Array<() => void | Promise<void>> = []
    const gerar = vi.fn(async () => { throw new Error('boom') })
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await criarHandlerFinish({ repo, agendar: (t) => tarefas.push(t), gerar })(post('4.4.4.4', corpo(sessao.sessionToken)))
    expect(tarefas).toHaveLength(1)
    await expect(Promise.resolve(tarefas[0]())).resolves.toBeUndefined()
    expect(gerar).toHaveBeenCalledTimes(1)
    expect(erro).toHaveBeenCalled()
    erro.mockRestore()
  })
})
