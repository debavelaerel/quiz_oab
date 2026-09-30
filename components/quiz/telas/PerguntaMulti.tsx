'use client'
import { useState } from 'react'
import type { Campo, Resp } from '@/lib/oab/fluxo'
import { alternar, juntar, opcoesDe, P } from '../copy'
import { Cabecalho } from './Cabecalho'

type Props = { k: Campo; A: Resp; hoje: string; idx: number; total: number; onConfirmar: (v: string) => void }

/** Múltipla escolha: gravada como "a+b" na ordem das opções; a opção exclusiva limpa as outras. */
export function PerguntaMulti({ k, A, hoje, idx, total, onConfirmar }: Props) {
  const ops = opcoesDe(k, A)
  const [sel, setSel] = useState<string[]>(() => (A[k] ?? '').split('+').filter(Boolean))
  return (
    <section className="screen">
      <Cabecalho k={k} A={A} hoje={hoje} idx={idx} total={total} />
      <div className="opts">
        {ops.map((o) => (
          <button key={o.v} className={`opt${sel.includes(o.v) ? ' sel' : ''}`} onClick={() => setSel((s) => alternar(s, o.v, P[k].exclusiva))}>
            <span className="dot sq" /><span><span className="t">{o.t}</span>{o.s ? <span className="s">{o.s}</span> : null}</span>
          </button>
        ))}
      </div>
      <button className="cta" disabled={!sel.length} onClick={() => onConfirmar(juntar(ops, sel))}>Continuar</button>
    </section>
  )
}
