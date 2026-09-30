/** Placeholder das telas que chegam na Task 10 (parte 2, teste, dados, resultado, saídas). */
export function EmConstrucao({ tela, onAvancar, rotulo = 'Avançar' }: { tela: string; onAvancar?: () => void; rotulo?: string }) {
  return (
    <section className="screen">
      <p className="step">Tela “{tela}”</p>
      <h2 className="q">Em construção</h2>
      <p className="hint">Esta tela chega na próxima etapa.</p>
      {onAvancar ? <button className="cta" onClick={onAvancar}>{rotulo}</button> : null}
    </section>
  )
}
