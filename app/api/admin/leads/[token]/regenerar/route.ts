import { carregarLead, responderAcao, type CtxToken } from '@/lib/server/adminRota'
import { obterRepo } from '@/lib/server/container'
import { gerarEArmazenarDiagnostico } from '@/lib/server/diagnosticoBackground'
import type { gerarDiagnosticoPdf } from '@/lib/server/diagnosticoService'
import type { enviarDiagnostico } from '@/lib/server/email'
import { statusEfetivo } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import type { DiagnosticoStatus } from '@/lib/server/types'

export const runtime = 'nodejs'
// Síncrono: o admin espera a geração (o fetch pro serviço de PDF tem timeout de 55s).
export const maxDuration = 60

const REGENERAVEIS: DiagnosticoStatus[] = ['erro', 'pendente', 'desligado']
// Um `pendente` recém-solicitado provavelmente ainda está sendo gerado (finish
// ou outro clique): evita rodar a geração duas vezes em paralelo.
const PENDENTE_RECENTE_MS = 60_000

type Deps = {
  repo: SessionRepo
  segredo: string | undefined
  gerar?: typeof gerarDiagnosticoPdf
  enviar?: typeof enviarDiagnostico
  agora?: () => Date
}

export function criarHandlerRegenerar(d: Deps) {
  return async function handler(req: Request, ctx: CtxToken): Promise<Response> {
    const r = await carregarLead(req, ctx, d.repo, d.segredo)
    if ('resposta' in r) return r.resposta
    const { sessao } = r
    const agora = (d.agora ?? (() => new Date()))()
    const atual = statusEfetivo(sessao, agora)
    if (!atual || !REGENERAVEIS.includes(atual)) {
      return responderAcao(req, sessao.diagnosticoToken, 'regenerar-invalido', { erro: 'diagnóstico não pode ser regenerado neste estado', status: atual }, 409)
    }
    if (atual === 'pendente' && sessao.diagnosticoSolicitadoEm &&
        agora.getTime() - new Date(sessao.diagnosticoSolicitadoEm).getTime() < PENDENTE_RECENTE_MS) {
      return responderAcao(req, sessao.diagnosticoToken, 'regenerar-em-andamento', { erro: 'o diagnóstico já está sendo gerado' }, 409)
    }
    const pendente = await d.repo.atualizar(sessao.id, {
      diagnosticoStatus: 'pendente', diagnosticoSolicitadoEm: agora.toISOString(), diagnosticoPdfErro: null,
    })
    // Nunca lança: falhas ficam em diagnostico_pdf_erro / email_erro.
    await gerarEArmazenarDiagnostico(d.repo, pendente, { gerar: d.gerar, enviar: d.enviar })
    const depois = await d.repo.buscarPorDiagnosticoToken(sessao.diagnosticoToken)
    const status = depois?.diagnosticoStatus ?? 'erro'
    return responderAcao(req, sessao.diagnosticoToken, `regenerar-${status}`, { status }, 200)
  }
}

export const POST = (req: Request, ctx: CtxToken) =>
  criarHandlerRegenerar({ repo: obterRepo(), segredo: process.env.ADMIN_SESSION_SECRET })(req, ctx)
