// Apoio só para os testes das rotas admin (não é importado por código de produção).
import { assinarSessao, NOME_COOKIE_ADMIN } from './adminAuth'
import { criarMemorySessionRepo } from './memorySessionRepo'
import type { QuizSession } from './types'

export const SEGREDO_TESTE = 'segredo-admin-de-teste-0123456789abcdef'
export const UTM_VAZIO = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }

export function reqAdmin(url = 'http://x', init: RequestInit & { logado?: boolean; form?: boolean } = {}): Request {
  const { logado = true, form = false, ...resto } = init
  const headers = new Headers(resto.headers)
  if (logado) headers.set('cookie', `${NOME_COOKIE_ADMIN}=${assinarSessao(SEGREDO_TESTE)}`)
  if (form) headers.set('content-type', 'application/x-www-form-urlencoded')
  return new Request(url, { ...resto, headers })
}

export async function leadConcluido(patch: Partial<QuizSession> = {}) {
  const repo = criarMemorySessionRepo()
  const s = await repo.criar({ hoje: '2026-09-30', utm: UTM_VAZIO })
  const c = (await repo.concluir(s.id, {
    codigo: 'QO1.x', email: 'a@b.com', nome: 'A', nomeCompleto: 'Ana B', tipo: 'ok', exame: '48', turma: 90,
    recomendacao: { tipo: 'ok', exame: '48', turma: 90, atalho: null },
    diagnosticoStatus: 'erro', diagnosticoPdfErro: 'x', diagnosticoSolicitadoEm: new Date().toISOString(),
    ...patch,
  }))!
  return { repo, s: c, params: { params: Promise.resolve({ token: c.diagnosticoToken }) } }
}
