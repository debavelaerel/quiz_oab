import { NextResponse } from 'next/server'
import { obterRepo } from '@/lib/server/container'
import { obterResultado, SessaoInvalidaError } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

export function criarHandlerResult(repo: SessionRepo) {
  return async function handler(req: Request): Promise<Response> {
    const token = new URL(req.url).searchParams.get('session_token') ?? ''
    if (!isUuid(token)) return NextResponse.json({ erro: 'session_token inválido' }, { status: 422 })
    try {
      return NextResponse.json(await obterResultado(repo, token), { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) {
      if (e instanceof SessaoInvalidaError) return NextResponse.json({ erro: 'sessão não encontrada' }, { status: 404 })
      throw e
    }
  }
}
export const GET = (req: Request) => criarHandlerResult(obterRepo())(req)
