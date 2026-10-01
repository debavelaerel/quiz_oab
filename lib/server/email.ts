import nodemailer, { type Transporter } from 'nodemailer'

export type Destinatario = { nome: string; email: string }

function transporteSmtp(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === '1',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    // Os padrões do nodemailer chegam a minutos: um SMTP que não responde
    // seguraria o envio em segundo plano por muito tempo.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
}

export async function enviarDiagnostico(
  dest: Destinatario,
  link: string,
  deps: { criarTransporte?: () => Transporter } = {},
): Promise<{ enviado: boolean; motivo?: string }> {
  if (!process.env.SMTP_HOST) return { enviado: false, motivo: 'smtp_desligado' }
  await (deps.criarTransporte ?? transporteSmtp)().sendMail({
    from: process.env.SMTP_FROM || 'Método VDE <nao-responda@localhost>',
    to: dest.email,
    subject: 'Seu diagnóstico da OAB está pronto',
    text: `Oi, ${dest.nome}!\n\nSeu diagnóstico completo da OAB está pronto. Baixe por aqui:\n${link}\n\nSe tiver dúvidas, é só chamar a gente no WhatsApp.\n\nMétodo VDE`,
  })
  return { enviado: true }
}
