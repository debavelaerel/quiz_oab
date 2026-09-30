// Formulário de dados (nome, e-mail, WhatsApp) e o envio do finish com o tratamento de erro.
import { emailValido, nomeValido, whatsappValido } from '@/lib/validacao'

export type CampoForm = 'nome' | 'email' | 'whatsapp'
export type Form = Record<CampoForm, string>

export const MSG_CONFERE = 'Confere o nome, o e-mail e o WhatsApp com DDD.'
export const MSG_FALHA = 'Não conseguimos registrar agora. Tente novamente.'

/** Mesma validação do servidor (lib/validacao). */
export function camposInvalidos(f: Form): CampoForm[] {
  const out: CampoForm[] = []
  if (!nomeValido(f.nome)) out.push('nome')
  if (!emailValido(f.email)) out.push('email')
  if (!whatsappValido(f.whatsapp)) out.push('whatsapp')
  return out
}

export const contatoDe = (f: Form) => ({ nome_completo: f.nome.trim(), email: f.email.trim(), whatsapp: f.whatsapp })

const DO_SERVIDOR: Record<string, CampoForm> = { nome_completo: 'nome', email: 'email', whatsapp: 'whatsapp' }

type ErroHttp = { status?: number; corpo?: { campos?: unknown } }

/** 422 com campos do formulário → esses campos; qualquer outro 422 (respostas etc.) → null. */
function camposDoErro(e: unknown): CampoForm[] | null {
  const { status, corpo } = (e ?? {}) as ErroHttp
  if (status !== 422 || !Array.isArray(corpo?.campos)) return null
  const campos = corpo.campos.map((c) => DO_SERVIDOR[String(c)]).filter(Boolean)
  return campos.length ? campos : null
}

export type ResultadoFinalizar<R> =
  | { tipo: 'ok'; resultado: R }
  | { tipo: 'campos'; campos: CampoForm[] }
  | { tipo: 'falha' }

/**
 * Envia o finish. Sessão perdida (404, ou nenhuma sessão porque o /start falhou) → abre uma sessão
 * nova e reenvia uma única vez (o finish leva o snapshot inteiro, então nada se perde).
 */
export async function finalizar<R>(d: {
  token: string
  enviar: (token: string) => Promise<R>
  novaSessao: () => Promise<string>
}): Promise<ResultadoFinalizar<R>> {
  const tratar = (e: unknown): ResultadoFinalizar<R> => {
    const campos = camposDoErro(e)
    return campos ? { tipo: 'campos', campos } : { tipo: 'falha' }
  }
  if (d.token) {
    try { return { tipo: 'ok', resultado: await d.enviar(d.token) } } catch (e) {
      if ((e as ErroHttp)?.status !== 404) return tratar(e)
    }
  }
  try {
    const novo = await d.novaSessao()
    return { tipo: 'ok', resultado: await d.enviar(novo) }
  } catch (e) { return tratar(e) }
}
