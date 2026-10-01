// Dados derivados das telas finais (resultado, prévia, cedo), portados de resultado()/previa()/
// telaCedo() do original. A recomendação vem sempre do servidor; aqui só se monta o que a tela mostra.
import data from '@/lib/oab/data.json'
import { L, type Resp } from '@/lib/oab/fluxo'
import type { Recomendacao } from '@/lib/oab/logic'
import { montarMensagemWhatsApp } from '@/lib/oab/whatsapp'
import { br } from './copy'

export const TESTE = data.teste
const ROTINAS = data.rotinas as Record<string, { horas: number; rotina: string }>
const R = (A: Resp) => A as Record<string, string>

export const brc = (s: string) => { const [, m, d] = s.split('-'); return `${d}/${m}` }

/** Quantas questões do teste bateram com o gabarito ("X" = não sabia). */
export const acertos = (teste: readonly string[]) => TESTE.filter((q, i) => teste[i] === q.gabarito).length

/** Link do botão do WhatsApp: número do time + mensagem pronta (sem o código QO1). */
export function linkWhatsApp(numero: string, p: { nome: string; rec: Recomendacao; ref: string }): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagemWhatsApp(p))}`
}

/** telaCedo(): o ano da primeira OAB possível e o mínimo do edital no regime da pessoa. */
export function quandoCedo(A: Resp, hoje: string): { ano: number; minimo: string } {
  return { ano: L.primeiraVez(R(A), hoje).ano, minimo: A.regime === 'ano' ? '5º ano' : '9º período' }
}

type Exame = (typeof data.exames)[number]

/** Os outros exames ainda possíveis (não passados), pelo nome — "Por que X e Y não são...". */
export function outrosExames(A: Resp, exame: string, hoje: string): string[] {
  return data.exames.filter((x) => x.id !== exame && L.statusExame(R(A), x, hoje) !== 'passou').map((x) => x.nome)
}

/** A lista "O seu diagnóstico completo já está pronto". */
export function itensDiagnostico(A: Resp, exame: string, hoje: string): string[] {
  const outros = outrosExames(A, exame, hoje)
  const itens: string[] = []
  if (A.situacao === 'cursando') itens.push('A projeção dos seus períodos, semestre a semestre, até a prova')
  if (outros.length) itens.push(`Por que ${outros.join(' e ')} ${outros.length > 1 ? 'não são' : 'não é'} a melhor escolha pra você agora`)
  itens.push('A turma do VDE que cabe na sua rotina e a data pra começar')
  itens.push('A correção comentada das 5 questões do teste, com o artigo de cada uma')
  itens.push(A.tentativa === 'reprov' ? 'O que precisa mudar no seu jeito de estudar pra não repetir a última prova' : 'O que muda no seu jeito de estudar a partir de agora')
  return itens
}

export function exameDe(id: string): Exame {
  const e = data.exames.find((x) => x.id === id)
  if (!e) throw new Error(`exame desconhecido: ${id}`)
  return e
}

/** Cabeçalho do resultado: "1ª fase em ..., daqui a N dias." */
export const diasAteProva = (exame: string, hoje: string) => L.diasAte(hoje, exameDe(exame).fase1)

type TurmaDatas = { inicio: string; inicio2?: string; aConfirmar?: boolean }

/** Início da turma como o lead vê; turma com datas ainda não divulgadas nunca mostra data (pacote do VDE, 30/09/2026). */
export function inicioTxt(t: TurmaDatas): string {
  if (t.aConfirmar) return 'início: data a confirmar'
  return `início previsto em ${br(t.inicio)}${t.inicio2 ? ` ou ${br(t.inicio2)}` : ''}`
}

export type Previa = {
  turma: { dias: number; texto: string } | null
  turmas: { dias: number; rotina: string; on: boolean }[]
  sinais: string[]
  correcao: { n: number; disciplina: string; comentario: string }[]
}

/** previa(rec): a prévia borrada do diagnóstico (títulos legíveis, conteúdo não). */
export function previaDe(rec: { exame: string; turma?: number | null }, teste: readonly string[], hoje: string): Previa {
  const t = rec.turma ? data.turmas.find((x) => x.exame === rec.exame && x.dias === rec.turma) ?? null : null
  const erradas = TESTE.filter((q, i) => teste[i] !== q.gabarito)
  return {
    turma: t ? { dias: t.dias, texto: inicioTxt(t) } : null,
    turmas: L.turmasDisponiveis(rec.exame, hoje).slice(0, 3)
      .map((x) => ({ dias: x.dias, rotina: ROTINAS[String(x.dias)].rotina, on: !!t && x.dias === t.dias })),
    sinais: (erradas.length ? erradas : TESTE.slice(0, 1)).slice(0, 2).map((q) => q.sinal.texto),
    correcao: TESTE.map((q, i) => ({ n: i + 1, disciplina: q.disciplina, comentario: `${q.comentario.slice(0, 90)}…` })),
  }
}
