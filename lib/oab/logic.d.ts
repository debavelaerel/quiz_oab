export type Respostas = Record<string, string>
export type Quando = { ano: number; sem: number | null }
export type Recomendacao =
  | { tipo: 'ok' | 'acima'; exame: string; turma: number }
  | { tipo: 'sem_turma'; exame: string }
  | { tipo: 'sem_prova' }
  | { tipo: 'f2' }
  | { tipo: 'cedo'; quando: Quando }
export type Atalho = { exame: string; turma: number; horas: number } | null
export type Turma = { exame: string; dias: number; vendasIni: string; vendasFim: string; inicio: string; inicio2?: string; aConfirmar?: boolean; fimVendasAConfirmar?: boolean }
export type StatusExame = 'passou' | 'nao_libera' | 'sem_inscricao' | 'ok'
export interface Logic {
  primeiraVez(A: Respostas, hoje: string): Quando
  statusExame(A: Respostas, ex: { fase1: string; inscFim: string; corte: string }, hoje: string): StatusExame
  turmasDisponiveis(exame: string, hoje: string): Turma[]
  diasAte(hoje: string, data: string): number
  cedo(A: Respostas, hoje: string): boolean
  perguntaTentativa(A: Respostas): boolean
  exameInscricaoFechada(A: Respostas, hoje: string): { id: string; nome: string } | null
  recomendar(A: Respostas, hoje: string): Recomendacao
  atalho(A: Respostas, hoje: string, rec: Recomendacao): Atalho
}
export function make(data: unknown): Logic
