import { NextResponse } from 'next/server'
import { obterRepo } from '@/lib/server/container'
import { ipDaRequisicao } from '@/lib/server/ip'
import { permitirRequisicao } from '@/lib/server/rateLimit'
import { EntradaInvalidaError, registrarSnapshot, SessaoConcluidaError, SessaoInvalidaError } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

export function criarHandlerAnswer(repo: SessionRepo) {
  return async function handler(req: Request): Promise<Response> {
    if (!permitirRequisicao(`answer:${ipDaRequisicao(req)}`, 120, 60_000)) {
      return NextResponse.json({ erro: 'muitas requisições' }, { status: 429 })
    }
    let c: Record<string, unknown>
    try { c = (await req.json()) ?? {} } catch { return NextResponse.json({ erro: 'json inválido' }, { status: 400 }) }
    if (typeof c.session_token !== 'string' || !isUuid(c.session_token) || typeof c.respostas !== 'object' || c.respostas === null) {
      return NextResponse.json({ erro: 'corpo inválido' }, { status: 422 })
    }
    try {
      const r = await registrarSnapshot(repo, {
        sessionToken: c.session_token, seq: Number(c.seq), respostas: c.respostas as Record<string, unknown>, teste: c.teste ?? [], nome: c.nome,
      })
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof SessaoInvalidaError) return NextResponse.json({ erro: 'sessão não encontrada' }, { status: 404 })
      if (e instanceof SessaoConcluidaError) return NextResponse.json({ erro: 'sessão já concluída' }, { status: 409 })
      if (e instanceof EntradaInvalidaError) return NextResponse.json({ erro: e.message, campos: e.campos }, { status: 422 })
      throw e
    }
  }
}

export const POST = (req: Request) => criarHandlerAnswer(obterRepo())(req)
