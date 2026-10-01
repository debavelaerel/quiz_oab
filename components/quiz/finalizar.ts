// Formulário de contato (WhatsApp + e-mail) e o envio do finish com o tratamento de erro.
import { emailValido, whatsappValido } from '@/lib/validacao'

export type CampoForm = 'email' | 'whatsapp'
export type Form = Record<CampoForm, string>

export const MSG_WHATSAPP = 'WhatsApp inválido. Use o formato (11) 91234-5678.'
export const MSG_EMAIL = 'E-mail inválido.'
export const MSG_CONFERE = 'Confere o WhatsApp com DDD e o e-mail.'
export const MSG_FALHA = 'Não conseguimos registrar agora. Tente novamente.'

/** Mesma validação do servidor (lib/validacao); ordem de exibição: WhatsApp, depois e-mail. */
export function camposInvalidos(f: Form): CampoForm[] {
  const out: CampoForm[] = []
  if (!whatsappValido(f.whatsapp)) out.push('whatsapp')
  if (!emailValido(f.email)) out.push('email')
  return out
}

export const contatoDe = (f: Form) => ({ email: f.email.trim(), whatsapp: f.whatsapp })

const DO_SERVIDOR: Record<string, CampoForm> = { email: 'email', whatsapp: 'whatsapp' }

type ErroHttp = { status?: number; corpo?: { campos?: unknown } }

export type ResultadoFinalizar<R> =
  | { tipo: 'ok'; resultado: R }
  | { tipo: 'campos'; campos: CampoForm[] }
  | { tipo: 'nome' }
  | { tipo: 'falha' }

function tratar<R>(e: unknown): ResultadoFinalizar<R> {
  const { status, corpo } = (e ?? {}) as ErroHttp
  if (status === 422 && Array.isArray(corpo?.campos)) {
    const cs = corpo.campos.map(String)
    if (cs.includes('nome')) return { tipo: 'nome' }
    const campos = cs.map((c) => DO_SERVIDOR[c]).filter(Boolean)
    if (campos.length) return { tipo: 'campos', campos }
  }
  return { tipo: 'falha' }
}

/**
 * Envia o finish. Sessão perdida (404, ou nenhuma sessão porque o /start falhou) → abre uma sessão
 * nova e reenvia uma única vez (o finish leva o snapshot inteiro e o nome, então nada se perde).
 */
export async function finalizar<R>(d: {
  token: string
  enviar: (token: string) => Promise<R>
  novaSessao: () => Promise<string>
}): Promise<ResultadoFinalizar<R>> {
  if (d.token) {
    try { return { tipo: 'ok', resultado: await d.enviar(d.token) } } catch (e) {
      if ((e as ErroHttp)?.status !== 404) return tratar<R>(e)
    }
  }
  try {
    const novo = await d.novaSessao()
    return { tipo: 'ok', resultado: await d.enviar(novo) }
  } catch (e) { return tratar<R>(e) }
}
