// O que a tela de resultado mostra sobre o PDF do diagnóstico, e a consulta periódica
// enquanto ele está sendo gerado em background.

export const CONSULTA = { intervaloMs: 3000, maxTentativas: 20 }

export type Diagnostico = { status: string | null; url: string | null }
/** baixar = botão de download; preparando = ainda gerando; whatsapp = vai pelo time; nenhum = não se aplica. */
export type VistaDiagnostico = 'baixar' | 'preparando' | 'whatsapp' | 'nenhum'

export function vistaDiagnostico(d: Diagnostico, esgotou: boolean): VistaDiagnostico {
  if (d.status === 'pronto' && d.url) return 'baixar'
  if (d.status === 'nao_se_aplica') return 'nenhum'
  if (d.status === 'pendente' && !esgotou) return 'preparando'
  return 'whatsapp' // erro, desligado, nulo ou pendente depois de esgotar as consultas: sem detalhes
}

/**
 * Consulta `buscar` a cada `intervaloMs` enquanto o status for `pendente`, no máximo `maxTentativas`
 * vezes (erro de rede conta como tentativa). Devolve a função que para tudo (desmontagem da tela).
 */
export function consultarDiagnostico<T extends { diagnostico: Diagnostico }>(o: {
  buscar: () => Promise<T>
  aoAtualizar: (r: T) => void
  aoEsgotar: () => void
  intervaloMs?: number
  maxTentativas?: number
}): () => void {
  const intervalo = o.intervaloMs ?? CONSULTA.intervaloMs
  const max = o.maxTentativas ?? CONSULTA.maxTentativas
  let feitas = 0
  let parado = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const rodada = async () => {
    timer = null
    feitas += 1
    let pendente = true
    try {
      const r = await o.buscar()
      if (parado) return
      o.aoAtualizar(r)
      pendente = r.diagnostico.status === 'pendente'
    } catch { if (parado) return }
    if (!pendente) return
    if (feitas >= max) { o.aoEsgotar(); return }
    timer = setTimeout(rodada, intervalo)
  }
  timer = setTimeout(rodada, intervalo)

  return () => { parado = true; if (timer !== null) clearTimeout(timer) }
}
