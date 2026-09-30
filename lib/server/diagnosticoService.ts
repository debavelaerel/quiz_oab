import { DATA_HASH } from '@/lib/oab/dataHash'
import type { QuizSession } from './types'

export class DiagnosticoIndisponivel extends Error {}
const TIMEOUT_MS = 55_000

export async function gerarDiagnosticoPdf(
  s: Pick<QuizSession, 'codigo' | 'nome' | 'diagnosticoToken' | 'recomendacao'>,
  deps: { fetch?: typeof fetch } = {},
): Promise<{ s3Key: string | null }> {
  const base = process.env.DIAGNOSTICO_SERVICE_URL
  const segredo = process.env.DIAGNOSTICO_SERVICE_SECRET
  if (!base || !segredo) throw new DiagnosticoIndisponivel('DIAGNOSTICO_SERVICE_URL/SECRET não configurados')
  if (!s.codigo || !s.recomendacao) throw new DiagnosticoIndisponivel('sessão sem código ou recomendação')
  const { tipo } = s.recomendacao
  const rec = { tipo, exame: 'exame' in s.recomendacao ? s.recomendacao.exame : null, turma: 'turma' in s.recomendacao ? s.recomendacao.turma : null }
  try {
    const r = await (deps.fetch ?? fetch)(`${base.replace(/\/$/, '')}/diagnostico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Diagnostico-Secret': segredo },
      body: JSON.stringify({ codigo: s.codigo, nome: s.nome ?? '', diagnostico_token: s.diagnosticoToken, data_hash: DATA_HASH, recomendacao: rec }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!r.ok) throw new DiagnosticoIndisponivel(`serviço de PDF respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return { s3Key: r.headers.get('X-Diagnostico-S3-Key') }
  } catch (e) {
    if (e instanceof DiagnosticoIndisponivel) throw e
    throw new DiagnosticoIndisponivel(`falha ao chamar o serviço de PDF: ${String(e)}`)
  }
}
