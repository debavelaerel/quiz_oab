import { NextResponse } from 'next/server'
import { obterRepo, permitirHojeOverride } from '@/lib/server/container'
import { resolverHoje } from '@/lib/server/hoje'
import { ipDaRequisicao } from '@/lib/server/ip'
import { permitirRequisicao } from '@/lib/server/rateLimit'
import { iniciarSessao } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

type Deps = { repo: SessionRepo; agora: () => Date; permitirOverride: boolean }
const texto = (v: unknown) => (typeof v === 'string' && v.length <= 200 ? v : null)

export function criarHandlerStart(d: Deps) {
  return async function handler(req: Request): Promise<Response> {
    if (!permitirRequisicao(`start:${ipDaRequisicao(req)}`, 20, 60_000)) {
      return NextResponse.json({ erro: 'muitas requisições' }, { status: 429 })
    }
    let corpo: Record<string, unknown>
    try { corpo = (await req.json()) ?? {} } catch { return NextResponse.json({ erro: 'json inválido' }, { status: 400 }) }

    const token = typeof corpo.session_token === 'string' && isUuid(corpo.session_token) ? corpo.session_token : undefined
    const u = (corpo.utm ?? {}) as Record<string, unknown>
    const hoje = resolverHoje({ agora: d.agora(), override: texto(corpo.hoje_override), permitir: d.permitirOverride })
    const { sessao, retomada } = await iniciarSessao(d.repo, {
      sessionToken: token,
      hoje,
      utm: { utmSource: texto(u.source), utmMedium: texto(u.medium), utmCampaign: texto(u.campaign), utmContent: texto(u.content), utmTerm: texto(u.term) },
    })
    return NextResponse.json({
      session_token: sessao.sessionToken, hoje: sessao.hoje, retomada,
      nome: retomada ? sessao.nome : null,
      respostas: retomada ? sessao.respostas : {}, teste: retomada ? sessao.teste : [], seq: sessao.seq,
    })
  }
}

export const POST = (req: Request) =>
  criarHandlerStart({ repo: obterRepo(), agora: () => new Date(), permitirOverride: permitirHojeOverride() })(req)
