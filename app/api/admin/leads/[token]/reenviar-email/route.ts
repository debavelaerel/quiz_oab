import { carregarLead, jsonAdmin, responderAcao, type CtxToken } from '@/lib/server/adminRota'
import { obterRepo } from '@/lib/server/container'
import { enviarDiagnostico } from '@/lib/server/email'
import { statusEfetivo } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'

export const runtime = 'nodejs'

type Deps = {
  repo: SessionRepo
  segredo: string | undefined
  enviar?: typeof enviarDiagnostico
  linkBase?: string
}

export function criarHandlerReenviarEmail(d: Deps) {
  return async function handler(req: Request, ctx: CtxToken): Promise<Response> {
    const r = await carregarLead(req, ctx, d.repo, d.segredo)
    if ('resposta' in r) return r.resposta
    const { sessao } = r
    const token = sessao.diagnosticoToken
    if (statusEfetivo(sessao) !== 'pronto') {
      return responderAcao(req, token, 'email-invalido', { erro: 'o diagnóstico ainda não está pronto' }, 409)
    }
    if (!sessao.email) return jsonAdmin({ erro: 'lead sem e-mail' }, 422)
    const enviar = d.enviar ?? enviarDiagnostico
    const linkBase = (d.linkBase ?? process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    let resultado: { enviado: boolean; motivo?: string }
    try {
      resultado = await enviar({ nome: sessao.nome ?? '', email: sessao.email }, `${linkBase}/api/diagnostico/${token}`)
    } catch (e) {
      console.error('[admin/reenviar-email] falha ao enviar', { ref: sessao.refCurta, erro: String(e) })
      resultado = { enviado: false, motivo: String(e) }
    }
    await d.repo.atualizar(sessao.id, resultado.enviado
      ? { emailEnviadoEm: new Date().toISOString(), emailErro: null }
      : { emailErro: resultado.motivo ?? 'não enviado' })
    return responderAcao(req, token, resultado.enviado ? 'email-enviado' : 'email-falhou', resultado, 200)
  }
}

export const POST = (req: Request, ctx: CtxToken) =>
  criarHandlerReenviarEmail({ repo: obterRepo(), segredo: process.env.ADMIN_SESSION_SECRET })(req, ctx)
