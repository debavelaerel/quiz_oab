// "Abrir no WhatsApp" do admin: conversa do time com o lead, com o resultado e o link estável do PDF.

export function linkWhatsappLead(p: {
  nome: string | null
  telefone: string | null
  exame: string | null
  turma: number | null
  linkPdf: string | null
}): string | null {
  const digitos = (p.telefone ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  const tel = digitos.startsWith('55') && digitos.length >= 12 ? digitos : `55${digitos}`
  const saudacao = p.nome ? `Oi, ${p.nome}! Tudo bem?` : 'Oi! Tudo bem?'
  const resultado = p.exame
    ? ` Aqui é do time do Método VDE: o seu resultado é a OAB ${p.exame}${p.turma ? `, turma de ${p.turma} dias` : ''}.`
    : ' Aqui é do time do Método VDE.'
  const pdf = p.linkPdf ? ` O seu diagnóstico completo está aqui: ${p.linkPdf}` : ''
  return `https://wa.me/${tel}?text=${encodeURIComponent(saudacao + resultado + pdf)}`
}
