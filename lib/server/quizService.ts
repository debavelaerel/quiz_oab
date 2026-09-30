import { montarCodigo } from '@/lib/oab/codigo'
import {
  completo, etapaAtual, L, RespostaInvalidaError, sanear, saida, validarTeste, type Resp,
} from '@/lib/oab/fluxo'
import { emailValido, nomeValido, whatsappValido } from '@/lib/validacao'
import { normalizeEmail, normalizeWhatsapp } from '@/lib/normalize'
import type { SessionRepo } from './sessionRepo'
import type { DiagnosticoStatus, QuizSession, RecomendacaoGravada, Utm } from './types'

export const VERSAO_CONSENTIMENTO = 'v1'
export const TIPOS_COM_DIAGNOSTICO = ['ok', 'acima', 'sem_turma']
const PENDENTE_MAX_MS = 10 * 60 * 1000

export class SessaoInvalidaError extends Error {}
export class SessaoConcluidaError extends Error {}
export class EntradaInvalidaError extends Error {
  constructor(message: string, public campos: string[] = []) { super(message) }
}

function comoEntradaInvalida<T>(fn: () => T): T {
  try { return fn() } catch (e) {
    if (e instanceof RespostaInvalidaError) throw new EntradaInvalidaError(e.message)
    throw e
  }
}

export async function iniciarSessao(repo: SessionRepo, p: { sessionToken?: string; utm: Utm; hoje: string }) {
  if (p.sessionToken) {
    const s = await repo.buscarPorToken(p.sessionToken)
    if (s && s.status === 'em_andamento' && s.hoje === p.hoje) return { sessao: s, retomada: true }
  }
  return { sessao: await repo.criar({ hoje: p.hoje, utm: p.utm }), retomada: false }
}

export async function registrarSnapshot(
  repo: SessionRepo,
  p: { sessionToken: string; seq: number; respostas: Record<string, unknown>; teste: unknown },
) {
  const s = await repo.buscarPorToken(p.sessionToken)
  if (!s) throw new SessaoInvalidaError()
  if (s.status === 'concluido') throw new SessaoConcluidaError()
  if (!Number.isInteger(p.seq) || p.seq < 1) throw new EntradaInvalidaError('seq inválido', ['seq'])

  const respostas = comoEntradaInvalida(() => sanear(p.respostas, s.hoje))
  const saiu = saida(respostas, s.hoje)
  const teste = saiu ? [] : comoEntradaInvalida(() => validarTeste(p.teste, true))
  const etapa = etapaAtual(respostas, teste, s.hoje)
  const status = saiu ? 'saiu' : 'em_andamento'

  const gravada = await repo.salvarSnapshot(s.id, { seq: p.seq, respostas, teste, status, saidaTipo: saiu, ultimaPergunta: etapa })
  if (gravada) return { aceito: true, status: gravada.status, etapa }
  // Não gravou: seq velho, ou a sessão foi concluída entre a leitura e a escrita.
  const atual = await repo.buscarPorToken(p.sessionToken)
  if (atual?.status === 'concluido') throw new SessaoConcluidaError()
  return { aceito: false, status: atual?.status ?? s.status, etapa: atual?.ultimaPergunta ?? etapa }
}

export type Contato = { nome_completo: unknown; email: unknown; whatsapp: unknown }

function validarContato(c: Contato) {
  const erros: string[] = []
  const nome = typeof c.nome_completo === 'string' ? c.nome_completo.trim() : ''
  const email = typeof c.email === 'string' ? c.email.trim() : ''
  const whatsapp = typeof c.whatsapp === 'string' ? c.whatsapp.trim() : ''
  if (!nomeValido(nome)) erros.push('nome_completo')
  if (!emailValido(email)) erros.push('email')
  if (!whatsappValido(whatsapp)) erros.push('whatsapp')
  if (erros.length) throw new EntradaInvalidaError('contato inválido', erros)
  return { nome, email, whatsapp }
}

export async function concluirSessao(
  repo: SessionRepo,
  p: { sessionToken: string; respostas: Record<string, unknown>; teste: unknown; contato: Contato; consentimento: unknown },
): Promise<{ sessao: QuizSession; novo: boolean }> {
  const s = await repo.buscarPorToken(p.sessionToken)
  if (!s) throw new SessaoInvalidaError()
  if (s.status === 'concluido') return { sessao: s, novo: false }

  if (p.consentimento !== true) throw new EntradaInvalidaError('consentimento obrigatório', ['consentimento'])
  const contato = validarContato(p.contato)
  const respostas = comoEntradaInvalida(() => sanear(p.respostas, s.hoje))
  if (!completo(respostas, s.hoje)) throw new EntradaInvalidaError('respostas incompletas ou com saída antecipada', ['respostas'])
  const teste = comoEntradaInvalida(() => validarTeste(p.teste, false))

  const rec = L.recomendar(respostas as Record<string, string>, s.hoje)
  const gravada: RecomendacaoGravada = { ...rec, atalho: L.atalho(respostas as Record<string, string>, s.hoje, rec) }
  const comDiagnostico = TIPOS_COM_DIAGNOSTICO.includes(rec.tipo)
  const agora = new Date().toISOString()

  const concluida = await repo.concluir(s.id, {
    respostas, teste, status: 'concluido', saidaTipo: null, ultimaPergunta: 'resultado',
    nomeCompleto: contato.nome, nome: contato.nome.split(/\s+/)[0],
    email: contato.email, whatsapp: contato.whatsapp,
    emailNormalizado: normalizeEmail(contato.email), whatsappNormalizado: normalizeWhatsapp(contato.whatsapp),
    consentimentoEm: agora, consentimentoVersao: VERSAO_CONSENTIMENTO,
    codigo: montarCodigo(respostas as Record<string, string>, teste, s.hoje),
    recomendacao: gravada, tipo: rec.tipo,
    exame: 'exame' in rec ? rec.exame : null, turma: 'turma' in rec ? rec.turma : null,
    diagnosticoStatus: comDiagnostico ? 'pendente' : 'nao_se_aplica',
    diagnosticoSolicitadoEm: comDiagnostico ? agora : null,
    completedAt: agora,
  })
  if (concluida) return { sessao: concluida, novo: true }
  // Perdeu a corrida: outra requisição concluiu primeiro.
  return { sessao: (await repo.buscarPorToken(p.sessionToken))!, novo: false }
}

export function statusEfetivo(s: Pick<QuizSession, 'diagnosticoStatus' | 'diagnosticoSolicitadoEm'>, agora: Date = new Date()): DiagnosticoStatus | null {
  if (s.diagnosticoStatus === 'pendente' && s.diagnosticoSolicitadoEm) {
    if (agora.getTime() - new Date(s.diagnosticoSolicitadoEm).getTime() > PENDENTE_MAX_MS) return 'erro'
  }
  return s.diagnosticoStatus
}

export async function obterResultado(repo: SessionRepo, sessionToken: string, agora: Date = new Date()) {
  const s = await repo.buscarPorToken(sessionToken)
  if (!s || s.status !== 'concluido' || !s.recomendacao) throw new SessaoInvalidaError()
  const status = statusEfetivo(s, agora)
  return {
    recomendacao: s.recomendacao,
    nome: s.nome,
    ref_curta: s.refCurta,
    hoje: s.hoje,
    diagnostico: {
      status,
      url: status === 'pronto' ? `/api/diagnostico/${s.diagnosticoToken}` : null,
    },
  }
}

export async function registrarCliqueWhatsapp(repo: SessionRepo, sessionToken: string): Promise<void> {
  const s = await repo.buscarPorToken(sessionToken)
  if (!s || s.whatsappClicadoEm) return
  await repo.atualizar(s.id, { whatsappClicadoEm: new Date().toISOString() })
}
