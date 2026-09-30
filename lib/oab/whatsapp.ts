import type { Recomendacao } from './logic'

export function montarMensagemWhatsApp(p: { nome: string; rec: Recomendacao; ref: string }): string {
  const abertura = `Oi! Sou ${p.nome} e fiz o quiz "Qual a OAB da sua aprovação em 2027?".`
  let meio: string
  if (p.rec.tipo === 'ok' || p.rec.tipo === 'acima') {
    meio = `O resultado foi OAB ${p.rec.exame}, com a turma de ${p.rec.turma} dias.`
  } else if (p.rec.tipo === 'sem_turma') {
    meio = `O resultado foi OAB ${p.rec.exame}, mas ainda sem turma com matrícula aberta.`
  } else {
    meio = 'Ainda não há prova possível para mim em 2027 e quero entender meus próximos passos.'
  }
  return `${abertura} ${meio} Minha referência: #${p.ref}`
}
