'use client'
import { useEffect, useRef } from 'react'
import { preconnect } from 'react-dom'
import { CONFIG } from '../copy'
import { useTrackAoMontar } from '../useTrackAoMontar'

/** telaParte2(): vídeo da Ana (player Panda) e as regras do teste. */
export function Parte2({ onComecar }: { onComecar: () => void }) {
  useTrackAoMontar('quiz_parte2')
  preconnect(new URL(CONFIG.videoParte2Src).origin)
  const frame = useRef<HTMLIFrameElement>(null)
  // O player começa mudo mesmo com autoplay; o clique que trouxe a pessoa até aqui já libera o áudio.
  useEffect(() => {
    const origem = new URL(CONFIG.videoParte2Src).origin
    const tirarMudo = () => frame.current?.contentWindow?.postMessage({ type: 'volume', parameter: 1 }, origem)
    const ids = [300, 1000, 2000, 3500].map((ms) => setTimeout(tirarMudo, ms))
    return () => ids.forEach(clearTimeout)
  }, [])
  const src = `${CONFIG.videoParte2Src}${CONFIG.videoParte2Src.includes('?') ? '&' : '?'}autoplay=true&muted=false&preload=true`
  return (
    <section className="screen">
      <p className="step" style={{ textAlign: 'center' }}>Parte 2 de 2 · Teste de nível</p>
      <h2 className="q" style={{ textAlign: 'center' }}>Agora vamos completar o seu diagnóstico</h2>
      <div className="video">
        <iframe
          ref={frame}
          src={src}
          title="Vídeo da Ana Clara"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="box"><ul>
        <li><b>5 questões reais</b> das últimas provas da OAB, uma de cada: Ética, Constitucional, Trabalho, Penal e Processo Civil.</li>
        <li>Responda sem consultar nada. É o seu nível de hoje que importa.</li>
        <li>Não sabe? Marque <b>&quot;Não sei&quot;</b>. Chute atrapalha o diagnóstico.</li>
      </ul></div>
      <button className="cta" onClick={onComecar}>Começar o teste</button>
    </section>
  )
}
