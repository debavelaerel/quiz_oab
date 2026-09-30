'use client'
import { CONFIG } from '../copy'
import { useTrackAoMontar } from '../useTrackAoMontar'

/** telaParte2(): vídeo (ou o placeholder do original, sem vídeo configurado) e as regras do teste. */
export function Parte2({ onComecar }: { onComecar: () => void }) {
  useTrackAoMontar('quiz_parte2')
  return (
    <section className="screen">
      <p className="step">Parte 2 de 2 · Teste de nível</p>
      <h2 className="q">Agora vamos completar o seu diagnóstico</h2>
      <div className="video">
        {CONFIG.videoParte2Src ? (
          <video src={CONFIG.videoParte2Src} controls playsInline preload="metadata" />
        ) : (
          <div className="ph">
            <div className="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
            <p><b>Vídeo da Ana Clara</b>Roteiro em roteiro-video.md. Troque CONFIG.videoParte2Src pelo link do vídeo.</p>
          </div>
        )}
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
