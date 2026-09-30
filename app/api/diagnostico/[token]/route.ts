import { NextResponse } from 'next/server'
import { obterRepo } from '@/lib/server/container'
import { statusEfetivo } from '@/lib/server/quizService'
import { assinarUrl } from '@/lib/server/s3'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

const CABECALHOS = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
const resposta = (corpo: object, status: number) => NextResponse.json(corpo, { status, headers: CABECALHOS })

type Deps = { repo: SessionRepo; assinar: (chave: string) => Promise<string>; agora: () => Date }

export function criarHandlerDiagnostico(d: Deps) {
  return async function handler(_req: Request, ctx: { params: Promise<{ token: string }> }): Promise<Response> {
    const { token } = await ctx.params
    if (!isUuid(token)) return resposta({ erro: 'não encontrado' }, 404)
    const s = await d.repo.buscarPorDiagnosticoToken(token)
    if (!s) return resposta({ erro: 'não encontrado' }, 404)
    switch (statusEfetivo(s, d.agora())) {
      case 'pronto': {
        if (!s.diagnosticoPdfS3Key) return resposta({ erro: 'indisponível' }, 425)
        let url: string
        try {
          url = await d.assinar(s.diagnosticoPdfS3Key)
        } catch (e) {
          // BUCKET_NAME ausente ou falha ao assinar: responde com os mesmos cabeçalhos
          // (no-store/noindex) em vez de deixar escapar um 500 genérico do Next.
          console.error('[diagnostico] falha ao assinar a URL do PDF', { erro: String(e) })
          return resposta({ erro: 'serviço de diagnóstico indisponível' }, 503)
        }
        return new NextResponse(null, { status: 302, headers: { ...CABECALHOS, Location: url } })
      }
      case 'pendente': case 'erro': return resposta({ erro: 'ainda não está pronto, tente em instantes' }, 425)
      case 'desligado': return resposta({ erro: 'serviço de diagnóstico desligado' }, 503)
      default: return resposta({ erro: 'não encontrado' }, 404)
    }
  }
}

export const GET = (req: Request, ctx: { params: Promise<{ token: string }> }) =>
  criarHandlerDiagnostico({ repo: obterRepo(), assinar: assinarUrl, agora: () => new Date() })(req, ctx)
