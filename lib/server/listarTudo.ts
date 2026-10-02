import type { FiltroListagem, SessionRepo } from './sessionRepo'
import type { QuizSession } from './types'

const POR_PAGINA = 500

/**
 * Lê as sessões em páginas de 500 até o `limite` (para o Analytics): o PostgREST corta respostas
 * grandes em silêncio, então nunca se pede tudo de uma vez. `total` é o total real, mesmo cortado.
 */
export async function listarTudo(
  repo: SessionRepo,
  filtro: Omit<FiltroListagem, 'pagina' | 'porPagina'>,
  limite = 5000,
): Promise<{ sessoes: QuizSession[]; total: number }> {
  const sessoes: QuizSession[] = []
  let total = 0
  for (let pagina = 1; sessoes.length < limite; pagina++) {
    const r = await repo.listar({ ...filtro, pagina, porPagina: POR_PAGINA })
    total = r.total
    sessoes.push(...r.sessoes)
    if (r.sessoes.length < POR_PAGINA || sessoes.length >= total) break
  }
  return { sessoes: sessoes.slice(0, limite), total }
}
