'use client'
import type { Resp } from '@/lib/oab/fluxo'
import { CONFIG } from '../copy'
import { quandoCedo } from '../resultado'
import { track } from '../track'
import { useTrackAoMontar } from '../useTrackAoMontar'

/** telaCedo(): cedo demais pra qualquer prova de 2027. */
export function Cedo({ A, hoje }: { A: Resp; hoje: string }) {
  useTrackAoMontar('quiz_result', { tipo: 'cedo' })
  const q = quandoCedo(A, hoje)
  return (
    <section className="screen">
      <div className="res">
        <p className="hi">Obrigada por responder!</p>
        <h2 className="q" style={{ margin: '10px 0 6px' }}>A sua OAB vem a partir de {q.ano}</h2>
        <p className="when">O edital só libera a prova pra quem está no <b>{q.minimo}</b>, então as provas de 2027 ainda não são pra você. Aproveita esse tempo pra caprichar na base da faculdade e segue a gente pra acompanhar tudo sobre a OAB.</p>
      </div>
      <a className="cta ghost" href={CONFIG.instagram} target="_blank" rel="noopener" onClick={() => track('quiz_instagram', { tipo: 'cedo' })}>Acompanhar o {CONFIG.instagramHandle}</a>
      <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
    </section>
  )
}
