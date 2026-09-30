'use client'
import { useState } from 'react'
import type { Campo, Resp } from '@/lib/oab/fluxo'
import { opcoesDe } from '../copy'
import { Cabecalho } from './Cabecalho'

type Props = { k: Campo; A: Resp; hoje: string; idx: number; total: number; onEscolher: (v: string) => void }

/** Escolha única. `periodo` vira a grade de números. */
export function Pergunta({ k, A, hoje, idx, total, onEscolher }: Props) {
  const [marcado, setMarcado] = useState(A[k])
  const ops = opcoesDe(k, A)
  const grade = k === 'periodo'
  const clicar = (v: string) => { setMarcado(v); onEscolher(v) }
  return (
    <section className="screen">
      <Cabecalho k={k} A={A} hoje={hoje} idx={idx} total={total} />
      <div className={grade ? `grid10${ops.length === 5 ? ' grid5' : ''}` : 'opts'}>
        {ops.map((o) => (
          <button key={o.v} className={`opt${marcado === o.v ? ' sel' : ''}`} onClick={() => clicar(o.v)}>
            {grade ? (
              <span className="t">{o.v}<small>º</small></span>
            ) : (
              <><span className="dot" /><span><span className="t">{o.t}</span>{o.s ? <span className="s">{o.s}</span> : null}</span></>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
