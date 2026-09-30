import { randomUUID } from 'node:crypto'
import { gerarRefCurta } from './refCurta'
import type { FiltroListagem, NovaSessao, SessionRepo } from './sessionRepo'
import type { QuizSession } from './types'

export function criarMemorySessionRepo(): SessionRepo & { todas(): QuizSession[] } {
  const linhas: QuizSession[] = []
  let proximoId = 1
  const agora = () => new Date().toISOString()
  const clone = <T,>(x: T): T => structuredClone(x)
  const porId = (id: number) => linhas.find((l) => l.id === id)

  return {
    todas: () => linhas.map(clone),
    async criar(nova: NovaSessao) {
      let ref = gerarRefCurta()
      while (linhas.some((l) => l.refCurta === ref)) ref = gerarRefCurta()
      const s: QuizSession = {
        id: proximoId++, sessionToken: randomUUID(), diagnosticoToken: randomUUID(), refCurta: ref,
        status: 'em_andamento', saidaTipo: null, ultimaPergunta: null, seq: 0, respostas: {}, teste: [],
        nomeCompleto: null, nome: null, email: null, whatsapp: null, emailNormalizado: null, whatsappNormalizado: null,
        consentimentoEm: null, consentimentoVersao: null, ...nova.utm, hoje: nova.hoje,
        codigo: null, recomendacao: null, tipo: null, exame: null, turma: null, whatsappClicadoEm: null,
        diagnosticoStatus: null, diagnosticoSolicitadoEm: null, diagnosticoPdfS3Key: null, diagnosticoPdfErro: null,
        emailEnviadoEm: null, emailErro: null, startedAt: agora(), updatedAt: agora(), completedAt: null,
      }
      linhas.push(s)
      return clone(s)
    },
    async buscarPorToken(t) { const s = linhas.find((l) => l.sessionToken === t); return s ? clone(s) : null },
    async buscarPorDiagnosticoToken(t) { const s = linhas.find((l) => l.diagnosticoToken === t); return s ? clone(s) : null },
    async buscarPorRef(r) { const s = linhas.find((l) => l.refCurta === r); return s ? clone(s) : null },
    async salvarSnapshot(id, patch) {
      const s = porId(id)
      if (!s || s.status === 'concluido' || !(s.seq < patch.seq)) return null
      Object.assign(s, clone(patch), { updatedAt: agora() })
      return clone(s)
    },
    async concluir(id, patch) {
      const s = porId(id)
      if (!s || s.status === 'concluido') return null
      Object.assign(s, clone(patch), { status: 'concluido', updatedAt: agora() })
      return clone(s)
    },
    async atualizar(id, patch) {
      const s = porId(id)
      if (!s) throw new Error('sessão inexistente')
      Object.assign(s, clone(patch), { updatedAt: agora() })
      return clone(s)
    },
    async listar(f: FiltroListagem) {
      const b = f.busca?.toLowerCase()
      const digitos = (f.busca ?? '').replace(/\D/g, '')
      const filtradas = linhas
        .filter((l) => !f.tipo || l.tipo === f.tipo)
        .filter((l) => !f.exame || l.exame === f.exame)
        .filter((l) => !f.status || l.status === f.status)
        .filter((l) => !b || [l.refCurta, l.nomeCompleto, l.email, l.whatsapp].some((c) => c?.toLowerCase().includes(b)) ||
          (digitos.length >= 4 && !!l.whatsappNormalizado?.includes(digitos)))
        .sort((a, c) => c.startedAt.localeCompare(a.startedAt) || c.id - a.id)
      const ini = (f.pagina - 1) * f.porPagina
      return { sessoes: filtradas.slice(ini, ini + f.porPagina).map(clone), total: filtradas.length }
    },
    async outrasTentativas(s) {
      return linhas
        .filter((l) => l.id !== s.id)
        .filter((l) => (s.emailNormalizado && l.emailNormalizado === s.emailNormalizado) ||
                       (s.whatsappNormalizado && l.whatsappNormalizado === s.whatsappNormalizado))
        .sort((a, c) => c.id - a.id).map(clone)
    },
  }
}
