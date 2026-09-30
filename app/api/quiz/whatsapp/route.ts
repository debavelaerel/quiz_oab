import { NextResponse } from 'next/server'
import { obterRepo } from '@/lib/server/container'
import { registrarCliqueWhatsapp } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

export function criarHandlerWhatsapp(repo: SessionRepo) {
  return async function handler(req: Request): Promise<Response> {
    const c = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>
    if (typeof c.session_token === 'string' && isUuid(c.session_token)) await registrarCliqueWhatsapp(repo, c.session_token)
    return new NextResponse(null, { status: 204 })
  }
}
export const POST = (req: Request) => criarHandlerWhatsapp(obterRepo())(req)
