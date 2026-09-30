import type { Campo, Resp } from '@/lib/oab/fluxo'
import { hintDe, tituloDe } from '../copy'

/** "Pergunta N de T", título e hint, como o `head` de pergunta() no original. */
export function Cabecalho({ k, A, hoje, idx, total }: { k: Campo; A: Resp; hoje: string; idx: number; total: number }) {
  const hint = hintDe(k, A, hoje)
  return (
    <>
      <p className="step">Pergunta {idx + 1} de {total}</p>
      <h2 className="q">{tituloDe(k, A, hoje)}</h2>
      {hint ? <p className="hint">{hint}</p> : null}
    </>
  )
}
