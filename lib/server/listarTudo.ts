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
  const vistos = new Set<number>()
  let total = 0
  for (let pagina = 1; sessoes.length < limite; pagina++) {
    const r = await repo.listar({ ...filtro, pagina, porPagina: POR_PAGINA })
    total = r.total
    // Sessões novas empurram linhas para a página seguinte: sem isso a mesma sessão seria contada duas vezes.
    for (const s of r.sessoes) if (!vistos.has(s.id)) { vistos.add(s.id); sessoes.push(s) }
    if (r.sessoes.length < POR_PAGINA || vistos.size >= total) break
  }
  return { sessoes: sessoes.slice(0, limite), total }
}
