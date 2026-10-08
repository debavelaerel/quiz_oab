// Textos do quiz, copiados literalmente do original (reference/qual-a-oab-dev/_build/index.src.html).
import data from '@/lib/oab/data.json'
import { L, opcoesValidas, type Campo, type Resp } from '@/lib/oab/fluxo'

export const CONFIG = {
  quizName: 'Qual a OAB da sua aprovação em 2027?',
  instagram: 'https://www.instagram.com/metodovde/',
  instagramHandle: '@metodovde',
  privacidadeTxt: 'Ao continuar, você concorda em receber contato do Método VDE pelo WhatsApp e por e-mail.',
  privacidadeUrl: process.env.NEXT_PUBLIC_PRIVACIDADE_URL || '',
  videoParte2Src: process.env.NEXT_PUBLIC_VIDEO_PARTE2 || 'https://player-vz-2733de96-443.tv.pandavideo.com.br/embed/?v=cb3813c8-c8b1-432f-aee0-14d36ae216b8',
}

type Pergunta = {
  titulo: string
  opcoes: string[][]
  multi?: boolean
  exclusiva?: string
  tituloAno?: string
  tituloReprov?: string
  rotulosReprov?: Record<string, string>
}
export const P = data.perguntas as unknown as Record<Campo, Pergunta>
export const EXAMES = data.exames
export const QTD_TESTE = data.teste.length

/** Uma opção como o original desenha: valor, rótulo e (opcional) linha de apoio. */
export type Opcao = { v: string; t: string; s?: string; /** valores gravados quando a opção junta várias respostas */ vs?: string[] }

type ExameInsc = { nome: string; inscFim: string }
const exameInsc = (A: Resp, hoje: string) =>
  L.exameInscricaoFechada(A as Record<string, string>, hoje) as unknown as ExameInsc | null

/** Mesmo cálculo de QOLogic.semIdx: 0 = 1º semestre, 1 = 2º. */
const semestre = (hoje: string) => (Number(hoje.slice(5, 7)) >= 7 ? 1 : 0)
export const br = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }

export function fimSemestre(hoje: string): string {
  const y = hoje.slice(0, 4)
  return semestre(hoje) ? `31 de dezembro de ${y}` : `30 de junho de ${y}`
}

/** Variações com o nome da pessoa (só a camada de UI; o data.json do VDE fica intocado). */
const COM_NOME: Partial<Record<Campo, string>> = {
  situacao: 'Pra começar, {nome}: como está a sua faculdade de Direito hoje?',
  nivel: '{nome}, com sinceridade: como está a sua base pra prova da OAB?',
  motivo: 'E agora a mais importante, {nome}: por que você quer passar na OAB?',
  compromisso: '{nome}, o quanto você topa mudar na sua rotina pra passar?',
}

export function tituloContato(nome: string): string {
  return nome ? `${nome}, deixe seu e-mail e WhatsApp pra receber o seu resultado` : 'Deixe seu e-mail e WhatsApp pra receber o seu resultado'
}

export function tituloDe(k: Campo, A: Resp, hoje: string, nome = ''): string {
  const modelo = nome ? COM_NOME[k] : undefined
  if (modelo) return modelo.replace('{nome}', () => nome) // função: "$&" digitado não é expandido
  const q = P[k]
  if (k === 'periodo') {
    return A.regime === 'ano' ? q.tituloAno!.replace('{ano}', hoje.slice(0, 4)) : q.titulo.replace('{fimSemestre}', fimSemestre(hoje))
  }
  if (k === 'metodo' && A.tentativa === 'reprov') return q.tituloReprov!
  if (k === 'inscrito') return q.titulo.replace('{exame}', exameInsc(A, hoje)?.nome ?? '')
  return q.titulo
}

export function hintDe(k: Campo, A: Resp, hoje: string): string {
  switch (k) {
    case 'periodo': return A.regime === 'ano'
      ? 'É o ano em que a sua matrícula está agora.'
      : 'É o período em que a sua matrícula está neste semestre, não o que você acabou de terminar.'
    case 'grade': return 'O edital olha o período em que a sua matrícula está, não quantos semestres você já fez.'
    case 'inscrito': { const e = exameInsc(A, hoje); return e ? `As inscrições da ${e.nome} fecharam em ${br(e.inscFim)}.` : '' }
    case 'horas': return 'Pensa num dia comum, com tudo o que você acabou de marcar. Melhor ser realista do que otimista.'
    case 'rotina': return 'Pode marcar mais de uma.'
    case 'motivo': return 'Pode marcar mais de uma. Vale tudo o que te faz levantar pra estudar.'
    case 'investir': return 'É só pra gente te mostrar a condição que faz sentido pra você.'
    case 'parcela': return 'No cartão, dá pra parcelar em até 12 vezes.'
    case 'compromisso': return 'Sem resposta certa. Sinceridade aqui ajuda a gente a te indicar o caminho certo.'
    case 'trava': return 'Pode marcar mais de uma.'
    case 'nivel': return 'Não existe resposta certa. Serve pra gente entender de onde você parte.'
    case 'pontos': return 'Se fez mais de uma vez, vale a última.'
    default: return ''
  }
}

/** Opções que o quiz não mostra mais (continuam válidas para respostas já gravadas). */
const OCULTAS: Partial<Record<Campo, string[]>> = { trava: ['reprovacao'], motivo: ['provar', 'emprego'] }
/** Opções que juntam várias respostas do data.json numa só: a primeira entra no lugar do grupo, as outras somem. */
const GRUPOS: Partial<Record<Campo, { t: string; vs: string[] }>> = {
  trava: { t: 'Não sei como a prova funciona, por onde começar e nem quais materiais são ideais', vs: ['prova', 'materia', 'materiais'] },
}

/** As opções visíveis (as válidas do servidor, menos as ocultas e com os grupos unidos) com os rótulos do original. */
export function opcoesDe(k: Campo, A: Resp): Opcao[] {
  const validas = new Set(opcoesValidas(k, A))
  const reprov = k === 'metodo' && A.tentativa === 'reprov' ? P.metodo.rotulosReprov ?? {} : {}
  const ocultas = new Set(OCULTAS[k] ?? [])
  const grupo = GRUPOS[k]
  return P[k].opcoes
    .filter((o) => validas.has(o[0]) && !ocultas.has(o[0]) && !(grupo && grupo.vs.slice(1).includes(o[0])))
    .map(([v, t, s]) => (grupo && v === grupo.vs[0]
      ? { v, t: grupo.t, vs: grupo.vs }
      : { v, t: reprov[v] ?? t, ...(s ? { s } : {}) }))
}

/** Clique numa opção de múltipla escolha: a exclusiva limpa as outras e vice-versa. */
export function alternar(sel: readonly string[], v: string, exclusiva?: string): string[] {
  if (sel.includes(v)) return sel.filter((x) => x !== v)
  if (v === exclusiva) return [v]
  return [...sel.filter((x) => x !== exclusiva), v]
}

/** Valor gravado: "a+b" na ordem canônica das opções. */
export function juntar(ops: readonly Opcao[], sel: readonly string[]): string {
  return ops.filter((o) => sel.includes(o.v)).flatMap((o) => o.vs ?? [o.v]).join('+')
}

/** Quais opções aparecem marcadas dado o valor gravado ("a+b"): a que junta várias só conta se todas estão lá. */
export function marcadas(ops: readonly Opcao[], gravado: string): string[] {
  const valores = gravado.split('+').filter(Boolean)
  return ops.filter((o) => (o.vs ?? [o.v]).every((v) => valores.includes(v))).map((o) => o.v)
}
