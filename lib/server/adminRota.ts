// Peças comuns das rotas /api/admin/leads/[token]/*.
import { exigirSessaoAdmin } from './adminAuth'
import type { SessionRepo } from './sessionRepo'
import type { QuizSession } from './types'
import { isUuid } from './uuid'

export type CtxToken = { params: Promise<{ token: string }> }

const SEM_CACHE = { 'Cache-Control': 'no-store' }
export const jsonAdmin = (corpo: object, status: number) => Response.json(corpo, { status, headers: SEM_CACHE })

/** Confere a sessão admin e carrega o lead pelo diagnostico_token; ou devolve a resposta de erro pronta. */
export async function carregarLead(
  req: Request, ctx: CtxToken, repo: SessionRepo, segredo: string | undefined,
): Promise<{ resposta: Response } | { sessao: QuizSession }> {
  const negado = exigirSessaoAdmin(req, segredo)
  if (negado) return { resposta: negado }
  const { token } = await ctx.params
  if (!isUuid(token)) return { resposta: jsonAdmin({ erro: 'não encontrado' }, 404) }
  const sessao = await repo.buscarPorDiagnosticoToken(token)
  if (!sessao) return { resposta: jsonAdmin({ erro: 'não encontrado' }, 404) }
  return { sessao }
}

const ehFormHtml = (req: Request) => (req.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded')

/**
 * Os botões da página de detalhe são <form method="post">: para eles, 303 de volta
 * ao detalhe com `?aviso=`; chamadas programáticas recebem o JSON.
 */
export function responderAcao(req: Request, token: string, aviso: string, corpo: object, status: number): Response {
  if (ehFormHtml(req)) {
    const destino = new URL(`/admin/leads/${token}`, req.url)
    destino.searchParams.set('aviso', aviso)
    return new Response(null, { status: 303, headers: { Location: destino.toString(), ...SEM_CACHE } })
  }
  return jsonAdmin(corpo, status)
}
