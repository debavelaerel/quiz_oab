'use client'
import { useState } from 'react'
import { TESTE } from '../resultado'

type Props = { i: number; inicial?: string; onConfirmar: (letra: string, comAtraso?: boolean) => void }

/** telaQuestao(i): clicar numa alternativa já responde e avança; ou "Não sei responder" (letra X). */
export function Questao({ i, inicial, onConfirmar }: Props) {
  const q = TESTE[i]
  const [sel, setSel] = useState<string | null>(inicial && inicial !== 'X' ? inicial : null)
  const marcar = (l: string) => { setSel(l); onConfirmar(l, true) }
  return (
    <section className="screen">
      <p className="step">Questão {i + 1} de {TESTE.length} · {q.disciplina} · OAB {q.exame}</p>
      <div className="enun">{q.enunciado.map((p, k) => <p key={k}>{p}</p>)}</div>
      <div className="opts">
        {Object.entries(q.alternativas).map(([l, t]) => (
          <button key={l} className={`opt alt${sel === l ? ' sel' : ''}`} onClick={() => marcar(l)}>
            <span className="let">{l}</span><span className="t">{t}</span>
          </button>
        ))}
      </div>
      <button className="restart" onClick={() => onConfirmar('X')}>Não sei responder</button>
    </section>
  )
}
