import data from '@/lib/oab/data.json'
import { lerFiltros } from '@/lib/adminFiltros'
import { rotuloResposta } from '@/lib/adminLabels'
import { exigirSessaoAdmin } from '@/lib/server/adminAuth'
import { obterRepo } from '@/lib/server/container'
import { montarCsv } from '@/lib/server/csv'
import { statusEfetivo } from '@/lib/server/quizService'
import type { SessionRepo } from '@/lib/server/sessionRepo'
import type { QuizSession } from '@/lib/server/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const POR_PAGINA = 500
const CAMPOS = data.campos as string[]
const CABECALHO = [
  'ref_curta', 'status', 'tipo', 'exame', 'turma', 'nome', 'email', 'whatsapp', 'diagnostico_status',
  'whatsapp_clicado_em', 'utm_source', 'utm_medium', 'utm_campaign', 'started_at', 'completed_at',
  'utm_content', 'utm_term', 'saida_tipo', 'ultima_pergunta', 'diagnostico_pdf_erro', 'email_erro', ...CAMPOS,
]

function linha(s: QuizSession, agora: Date): unknown[] {
  const respostas = s.respostas as Record<string, string | undefined>
  return [
    s.refCurta, s.status, s.tipo, s.exame, s.turma, s.nomeCompleto ?? s.nome, s.email, s.whatsapp, statusEfetivo(s, agora),
    s.whatsappClicadoEm, s.utmSource, s.utmMedium, s.utmCampaign, s.startedAt, s.completedAt,
    s.utmContent, s.utmTerm, s.saidaTipo, s.ultimaPergunta, s.diagnosticoPdfErro, s.emailErro,
    ...CAMPOS.map((c) => (c === 'teste' ? s.teste.join('') : respostas[c] ? rotuloResposta(c, respostas[c]) : '')),
  ]
}

export function criarHandlerExport(d: { repo: SessionRepo; segredo: string | undefined }) {
  return async function handler(req: Request): Promise<Response> {
    const negado = exigirSessaoAdmin(req, d.segredo)
    if (negado) return negado
    const { busca, tipo, exame, status } = lerFiltros(new URL(req.url).searchParams)
    const agora = new Date()
    const linhas: unknown[][] = []
    for (let pagina = 1; ; pagina++) {
      const { sessoes } = await d.repo.listar({ busca, tipo, exame, status, pagina, porPagina: POR_PAGINA })
      for (const s of sessoes) linhas.push(linha(s, agora))
      if (sessoes.length < POR_PAGINA) break
    }
    // BOM: o Excel abre o UTF-8 com acentos certos.
    return new Response('﻿' + montarCsv(CABECALHO, linhas), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads.csv"',
        'Cache-Control': 'no-store',
      },
    })
  }
}

export const GET = (req: Request) => criarHandlerExport({ repo: obterRepo(), segredo: process.env.ADMIN_SESSION_SECRET })(req)
