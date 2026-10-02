import { DATA_HASH } from '@/lib/oab/dataHash'
import type { QuizSession } from './types'

export class DiagnosticoIndisponivel extends Error {}
const TIMEOUT_MS = 55_000

type DadosSessao = Pick<QuizSession, 'codigo' | 'nome' | 'diagnosticoToken' | 'recomendacao'>

/** Corpo comum de /diagnostico e /diagnostico/html. */
function montarCorpo(s: DadosSessao): string {
  if (!s.codigo || !s.recomendacao) throw new DiagnosticoIndisponivel('sessão sem código ou recomendação')
  const { tipo } = s.recomendacao
  const rec = { tipo, exame: 'exame' in s.recomendacao ? s.recomendacao.exame : null, turma: 'turma' in s.recomendacao ? s.recomendacao.turma : null }
  return JSON.stringify({ codigo: s.codigo, nome: s.nome ?? '', diagnostico_token: s.diagnosticoToken, data_hash: DATA_HASH, recomendacao: rec })
}

function configuracao(): { base: string; segredo: string } {
  const base = process.env.DIAGNOSTICO_SERVICE_URL
  const segredo = process.env.DIAGNOSTICO_SERVICE_SECRET
  if (!base || !segredo) throw new DiagnosticoIndisponivel('DIAGNOSTICO_SERVICE_URL/SECRET não configurados')
  return { base: base.replace(/\/$/, ''), segredo }
}

export async function gerarDiagnosticoPdf(
  s: DadosSessao,
  deps: { fetch?: typeof fetch } = {},
): Promise<{ s3Key: string | null }> {
  const { base, segredo } = configuracao()
  const corpo = montarCorpo(s)
  try {
    const r = await (deps.fetch ?? fetch)(`${base}/diagnostico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Diagnostico-Secret': segredo },
      body: corpo,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!r.ok) throw new DiagnosticoIndisponivel(`serviço de PDF respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return { s3Key: r.headers.get('X-Diagnostico-S3-Key') }
  } catch (e) {
    if (e instanceof DiagnosticoIndisponivel) throw e
    throw new DiagnosticoIndisponivel(`falha ao chamar o serviço de PDF: ${String(e)}`)
  }
}

const TIMEOUT_HTML_MS = 15_000

/** HTML do diagnóstico (o mesmo que vira PDF) para o admin exibir. Nunca lança: devolve `{ erro }` curto. */
export async function buscarDiagnosticoHtml(
  s: DadosSessao,
  deps: { fetch?: typeof fetch } = {},
): Promise<{ html: string } | { erro: string }> {
  try {
    const { base, segredo } = configuracao()
    const corpo = montarCorpo(s)
    const r = await (deps.fetch ?? fetch)(`${base}/diagnostico/html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Diagnostico-Secret': segredo },
      body: corpo,
      signal: AbortSignal.timeout(TIMEOUT_HTML_MS),
    })
    if (r.status === 409) return { erro: 'o serviço de PDF está com uma versão diferente dos dados (recrie o container do serviço)' }
    if (!r.ok) return { erro: `o serviço de PDF respondeu ${r.status}` }
    return { html: await r.text() }
  } catch (e) {
    return { erro: e instanceof DiagnosticoIndisponivel ? e.message : 'não foi possível falar com o serviço de PDF' }
  }
}
