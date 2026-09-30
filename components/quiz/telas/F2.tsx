'use client'
import { CONFIG } from '../copy'
import { track } from '../track'
import { useTrackAoMontar } from '../useTrackAoMontar'

/** telaF2(): já passou da 1ª fase; agradece sem pedir contato. */
export function F2() {
  useTrackAoMontar('quiz_result', { tipo: 'f2' })
  return (
    <section className="screen">
      <div className="res">
        <p className="hi">Parabéns pela 1ª fase!</p>
        <h2 className="q" style={{ margin: '10px 0 6px' }}>Obrigada por responder</h2>
        <p className="when">Esse quiz é pra quem ainda vai fazer a 1ª fase. Como você já passou dela, o seu foco agora é a 2ª. Segue a gente pra acompanhar tudo sobre ela.</p>
      </div>
      <a className="cta ghost" href={CONFIG.instagram} target="_blank" rel="noopener" onClick={() => track('quiz_instagram', { tipo: 'f2' })}>Acompanhar o {CONFIG.instagramHandle}</a>
      <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
    </section>
  )
}
