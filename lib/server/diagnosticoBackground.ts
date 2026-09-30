import { DiagnosticoIndisponivel, gerarDiagnosticoPdf } from './diagnosticoService'
import { enviarDiagnostico } from './email'
import type { SessionRepo } from './sessionRepo'
import type { QuizSession } from './types'

type Deps = {
  gerar?: typeof gerarDiagnosticoPdf
  enviar?: typeof enviarDiagnostico
  linkBase?: string
}

/** Roda dentro de `after()`: NUNCA lança. Problemas ficam em diagnostico_pdf_erro / email_erro. */
export async function gerarEArmazenarDiagnostico(repo: SessionRepo, sessao: QuizSession, deps: Deps = {}): Promise<void> {
  const gerar = deps.gerar ?? gerarDiagnosticoPdf
  const enviar = deps.enviar ?? enviarDiagnostico
  const linkBase = (deps.linkBase ?? process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
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
  if (!sessao.email) return
  try {
    const r = await enviar({ nome: sessao.nome ?? '', email: sessao.email }, `${linkBase}/api/diagnostico/${sessao.diagnosticoToken}`)
    await repo.atualizar(sessao.id, r.enviado ? { emailEnviadoEm: new Date().toISOString(), emailErro: null } : { emailErro: r.motivo ?? 'não enviado' })
  } catch (e) {
    await repo.atualizar(sessao.id, { emailErro: String(e) }).catch(() => undefined)
  }
}
