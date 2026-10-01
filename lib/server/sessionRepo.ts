import type { QuizSession, Utm } from './types'

export type NovaSessao = { hoje: string; utm: Utm }

export type FiltroListagem = {
  busca?: string // ref, nome, e-mail ou WhatsApp (substring, sem caixa)
  tipo?: string
  exame?: string
  status?: QuizSession['status']
  pagina: number
  porPagina: number
}

export interface SessionRepo {
  /** Gera a ref_curta internamente (com retry em colisão). */
  criar(nova: NovaSessao): Promise<QuizSession>
  buscarPorToken(sessionToken: string): Promise<QuizSession | null>
  buscarPorDiagnosticoToken(token: string): Promise<QuizSession | null>
  buscarPorRef(ref: string): Promise<QuizSession | null>
  /** Atômico: só grava se seq < patch.seq e status <> 'concluido'. Devolve null se não gravou. */
  salvarSnapshot(
    id: number,
    patch: Pick<QuizSession, 'seq' | 'respostas' | 'teste' | 'status' | 'saidaTipo' | 'ultimaPergunta'> & Partial<Pick<QuizSession, 'nome'>>,
  ): Promise<QuizSession | null>
  /** Atômico: só conclui se status <> 'concluido'. Devolve null se já estava concluída. */
  concluir(id: number, patch: Partial<QuizSession>): Promise<QuizSession | null>
  atualizar(id: number, patch: Partial<QuizSession>): Promise<QuizSession>
  listar(filtro: FiltroListagem): Promise<{ sessoes: QuizSession[]; total: number }>
  /** Outras tentativas da mesma pessoa (mesmo e-mail ou WhatsApp normalizado), mais recente primeiro. */
  outrasTentativas(sessao: QuizSession): Promise<QuizSession[]>
}
