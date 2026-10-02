// Rótulos legíveis para o painel administrativo. As respostas vêm direto de
// data.json (mesma fonte do quiz), então não há texto duplicado pra manter.
import data from './oab/data.json'
import type { DiagnosticoStatus, StatusSessao } from './server/types'

type Pergunta = { titulo: string; opcoes: [string, string, string?][] }
const PERGUNTAS = data.perguntas as unknown as Record<string, Pergunta>
const VAZIO = '—'

export const ROTULO_TIPO: Record<string, string> = {
  ok: 'Turma no ritmo',
  acima: 'Turma acima do ritmo',
  sem_turma: 'Sem turma aberta',
  sem_prova: 'Sem prova possível',
  f2: '2ª fase',
  cedo: 'Cedo demais',
}

export const ROTULO_DIAGNOSTICO: Record<DiagnosticoStatus, string> = {
  nao_se_aplica: 'Não se aplica',
  pendente: 'Gerando…',
  pronto: 'Pronto',
  erro: 'Erro',
  desligado: 'Desligado',
}

export const ROTULO_STATUS: Record<StatusSessao, string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  saiu: 'Saiu',
}

export const EXAMES = (data.exames as { id: string; nome: string }[]).map((e) => ({ id: e.id, nome: e.nome }))

export const tituloPergunta = (campo: string): string => PERGUNTAS[campo]?.titulo ?? campo

export function rotuloResposta(campo: string, valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return VAZIO
  const opcoes = PERGUNTAS[campo]?.opcoes
  if (!opcoes) return valor
  return valor
    .split('+')
    .map((v) => opcoes.find((o) => o[0] === v)?.[1] ?? v)
    .join('; ')
}

export const rotuloTeste = (teste: string[] | null | undefined): string => (teste?.length ? teste.join(' ') : VAZIO)
export const rotuloTipo = (tipo: string | null | undefined): string => (tipo ? (ROTULO_TIPO[tipo] ?? tipo) : VAZIO)
export const rotuloDiagnostico = (s: DiagnosticoStatus | null | undefined): string => (s ? ROTULO_DIAGNOSTICO[s] ?? s : VAZIO)
export const rotuloStatus = (s: StatusSessao | null | undefined): string => (s ? ROTULO_STATUS[s] ?? s : VAZIO)
export const rotuloExame = (e: string | null | undefined): string =>
  e ? (EXAMES.find((x) => x.id === e)?.nome ?? `OAB ${e}`) : VAZIO
export const rotuloTurma = (dias: number | null | undefined): string => (dias ? `Turma de ${dias} dias` : VAZIO)

type Aviso = { tom: 'ok' | 'erro'; texto: string }
const AVISOS: Record<string, Aviso> = {
  'regenerar-pronto': { tom: 'ok', texto: 'Diagnóstico regenerado: pronto.' },
  'regenerar-erro': { tom: 'erro', texto: 'A regeneração falhou (serviço de PDF indisponível?). Veja o erro no bloco Diagnóstico.' },
  'regenerar-desligado': { tom: 'erro', texto: 'Serviço de diagnóstico desligado (armazenamento não configurado).' },
  'regenerar-pendente': { tom: 'ok', texto: 'Regeneração em andamento.' },
  'regenerar-em-andamento': { tom: 'erro', texto: 'O diagnóstico já está sendo gerado. Aguarde um minuto e recarregue.' },
  'regenerar-invalido': { tom: 'erro', texto: 'Este diagnóstico não pode ser regenerado no estado atual.' },
  'email-enviado': { tom: 'ok', texto: 'E-mail reenviado.' },
  'email-falhou': { tom: 'erro', texto: 'Não foi possível reenviar o e-mail. Veja o erro no bloco Diagnóstico.' },
  'email-invalido': { tom: 'erro', texto: 'O e-mail só pode ser reenviado com o diagnóstico pronto.' },
}
export const mensagemAviso = (aviso: string | undefined): Aviso | null =>
  aviso && Object.hasOwn(AVISOS, aviso) ? AVISOS[aviso] : null

const FMT_DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
export const formatarData = (iso: string | null | undefined): string => (iso ? FMT_DATA.format(new Date(iso)) : VAZIO)

/** Etapa do quiz em que o lead parou (`ultima_pergunta`): pergunta, teste, contato ou saída antecipada. */
export function rotuloEtapa(id: string): string {
  if (/^t\d$/.test(id)) return `Teste — questão ${Number(id.slice(1)) + 1}`
  if (id === 'dados') return 'Formulário de contato'
  if (id === 'cedo') return 'Saiu: ainda é cedo para a OAB'
  if (id === 'f2') return 'Saiu: já passou na 1ª fase'
  if (id === 'resultado') return 'Resultado'
  return PERGUNTAS[id] ? tituloPergunta(id).replace(/\{[^}]+\}/g, '…') : id
}
