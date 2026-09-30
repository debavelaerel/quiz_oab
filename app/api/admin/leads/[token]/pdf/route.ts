import { carregarLead, jsonAdmin, type CtxToken } from '@/lib/server/adminRota'
import { obterRepo } from '@/lib/server/container'
import { statusEfetivo } from '@/lib/server/quizService'
import { assinarUrl } from '@/lib/server/s3'
import type { SessionRepo } from '@/lib/server/sessionRepo'

export const runtime = 'nodejs'

type Deps = { repo: SessionRepo; segredo: string | undefined; assinar: (chave: string) => Promise<string>; agora: () => Date }

export function criarHandlerPdfAdmin(d: Deps) {
  return async function handler(req: Request, ctx: CtxToken): Promise<Response> {
    const r = await carregarLead(req, ctx, d.repo, d.segredo)
    if ('resposta' in r) return r.resposta
    const s = r.sessao
    switch (statusEfetivo(s, d.agora())) {
      case 'pronto': {
        if (!s.diagnosticoPdfS3Key) return jsonAdmin({ erro: 'PDF indisponível' }, 425)
        try {
          const url = await d.assinar(s.diagnosticoPdfS3Key)
          return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } })
        } catch (e) {
          console.error('[admin/pdf] falha ao assinar a URL do PDF', { ref: s.refCurta, erro: String(e) })
          return jsonAdmin({ erro: 'serviço de diagnóstico indisponível' }, 503)
        }
      }
      case 'pendente': case 'erro': return jsonAdmin({ erro: 'o diagnóstico ainda não está pronto' }, 425)
      default: return jsonAdmin({ erro: 'este lead não tem PDF' }, 404)
    }
  }
}

export const GET = (req: Request, ctx: CtxToken) =>
  criarHandlerPdfAdmin({ repo: obterRepo(), segredo: process.env.ADMIN_SESSION_SECRET, assinar: assinarUrl, agora: () => new Date() })(req, ctx)
