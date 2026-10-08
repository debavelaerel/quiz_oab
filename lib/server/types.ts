import type { Resp } from '@/lib/oab/fluxo'
import type { Atalho, Recomendacao, Turma } from '@/lib/oab/logic'

export type StatusSessao = 'em_andamento' | 'concluido' | 'saiu'
export type DiagnosticoStatus = 'nao_se_aplica' | 'pendente' | 'pronto' | 'erro' | 'desligado'
/** `turmas`: as datas em vigor quando a pessoa respondeu (o PDF e a tela usam estas, mesmo que o admin mude depois). */
export type RecomendacaoGravada = Recomendacao & { atalho: Atalho; turmas?: Turma[] }

export type QuizSession = {
  id: number
  sessionToken: string
  diagnosticoToken: string
  refCurta: string
  status: StatusSessao
  saidaTipo: 'cedo' | 'f2' | null
  ultimaPergunta: string | null
  seq: number
  respostas: Resp
  teste: string[]
  nomeCompleto: string | null
  nome: string | null
  email: string | null
  whatsapp: string | null
  emailNormalizado: string | null
  whatsappNormalizado: string | null
  consentimentoEm: string | null
  consentimentoVersao: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  hoje: string
  codigo: string | null
  recomendacao: RecomendacaoGravada | null
  tipo: string | null
  exame: string | null
  turma: number | null
  whatsappClicadoEm: string | null
  diagnosticoStatus: DiagnosticoStatus | null
  diagnosticoSolicitadoEm: string | null
  diagnosticoPdfS3Key: string | null
  diagnosticoPdfErro: string | null
  emailEnviadoEm: string | null
  emailErro: string | null
  startedAt: string
  updatedAt: string
  completedAt: string | null
}

export type Utm = Pick<QuizSession, 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm'>
