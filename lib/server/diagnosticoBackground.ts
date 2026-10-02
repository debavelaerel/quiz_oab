import { DiagnosticoIndisponivel, gerarDiagnosticoPdf } from './diagnosticoService'
import type { SessionRepo } from './sessionRepo'
import type { QuizSession } from './types'

type Deps = {
  gerar?: typeof gerarDiagnosticoPdf
}

/**
 * Roda dentro de `after()`: NUNCA lança. Problemas ficam em diagnostico_pdf_erro.
 * O diagnóstico não é mais enviado por e-mail ao lead: o time baixa o PDF no admin e manda pelo WhatsApp.
 */
export async function gerarEArmazenarDiagnostico(repo: SessionRepo, sessao: QuizSession, deps: Deps = {}): Promise<void> {
  const gerar = deps.gerar ?? gerarDiagnosticoPdf
  try {
    const { s3Key } = await gerar(sessao)
    if (!s3Key) {
      await repo.atualizar(sessao.id, { diagnosticoStatus: 'desligado', diagnosticoPdfErro: null })
      return
    }
    await repo.atualizar(sessao.id, { diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: s3Key, diagnosticoPdfErro: null })
  } catch (e) {
    const msg = e instanceof DiagnosticoIndisponivel ? e.message : String(e)
    console.error('[diagnosticoBackground] falha ao gerar', { ref: sessao.refCurta, erro: msg })
    await repo.atualizar(sessao.id, { diagnosticoStatus: 'erro', diagnosticoPdfErro: msg }).catch(() => undefined)
    return
  }
}
