import { after, NextResponse } from 'next/server'
import { gerarEArmazenarDiagnostico } from '@/lib/server/diagnosticoBackground'
import { obterRepo, obterTurmas } from '@/lib/server/container'
import { ipDaRequisicao } from '@/lib/server/ip'
import { permitirRequisicao } from '@/lib/server/rateLimit'
import {
  concluirSessao, EntradaInvalidaError, obterResultado, SessaoInvalidaError, TIPOS_COM_DIAGNOSTICO,
} from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import type { Turma } from '@/lib/oab/turmas'
import type { QuizSession } from '@/lib/server/types'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'
export const maxDuration = 90

// `after()` exige contexto de requisição do Next; nos testes entra um stub.
type Agendar = (tarefa: () => void | Promise<void>) => void

export function criarHandlerFinish(d: { repo: SessionRepo; agendar: Agendar; turmas?: () => Promise<Turma[]>; gerar?: (repo: SessionRepo, s: QuizSession) => Promise<void> }) {
  const gerar = d.gerar ?? ((repo, s) => gerarEArmazenarDiagnostico(repo, s))
  return async function handler(req: Request): Promise<Response> {
    if (!permitirRequisicao(`finish:${ipDaRequisicao(req)}`, 10, 60_000)) {
      return NextResponse.json({ erro: 'muitas requisições' }, { status: 429 })
    }
    let c: Record<string, unknown>
    try { c = (await req.json()) ?? {} } catch { return NextResponse.json({ erro: 'json inválido' }, { status: 400 }) }
    if (typeof c.session_token !== 'string' || !isUuid(c.session_token) || typeof c.respostas !== 'object' || c.respostas === null || typeof c.contato !== 'object' || c.contato === null) {
      return NextResponse.json({ erro: 'corpo inválido' }, { status: 422 })
    }
    try {
      const { sessao, novo } = await concluirSessao(d.repo, {
        sessionToken: c.session_token, respostas: c.respostas as Record<string, unknown>, teste: c.teste,
        contato: c.contato as never, consentimento: c.consentimento, nome: c.nome,
        turmas: d.turmas ? await d.turmas() : undefined,
      })
      if (novo && sessao.tipo && TIPOS_COM_DIAGNOSTICO.includes(sessao.tipo)) {
        d.agendar(() => gerar(d.repo, sessao).catch((e) => console.error('[finish] diagnóstico em background falhou', e)))
      }
      // Serializa só o resultado público; a sessão tem PII (e-mail, WhatsApp, token do diagnóstico).
      return NextResponse.json(await obterResultado(d.repo, sessao.sessionToken))
    } catch (e) {
      if (e instanceof SessaoInvalidaError) return NextResponse.json({ erro: 'sessão não encontrada' }, { status: 404 })
      if (e instanceof EntradaInvalidaError) return NextResponse.json({ erro: e.message, campos: e.campos }, { status: 422 })
      throw e
    }
  }
}

export const POST = (req: Request) => criarHandlerFinish({ repo: obterRepo(), agendar: after, turmas: async () => (await obterTurmas().atuais()).turmas })(req)
