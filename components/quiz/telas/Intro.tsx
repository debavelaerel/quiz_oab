import { EXAMES } from '../copy'

export function Intro({ onComecar }: { onComecar: () => void }) {
  return (
    <section className="screen">
      <div className="hero">
        <span className="pill">Quiz rápido · 5 minutos</span>
        <h1>Qual a OAB da sua aprovação em 2027?</h1>
        <p>Veja qual é a OAB ideal pra você se preparar em 2027, com base no semestre que você está cursando, no seu tempo disponível e no seu nível de conhecimento pra prova.</p>
        <div className="trio">
          {EXAMES.map((e) => (
            <div key={e.id}><span className="num">{e.id}</span><span>prova em {e.mes}</span></div>
          ))}
        </div>
      </div>
      <div className="factors">
        <div className="factor"><i>1</i><span><b>O seu semestre na faculdade.</b> O edital só libera a prova pra quem estiver no 9º período no prazo.</span></div>
        <div className="factor"><i>2</i><span><b>O seu tempo por dia.</b> Cada turma do VDE tem um ritmo diferente.</span></div>
        <div className="factor"><i>3</i><span><b>O seu nível hoje.</b> Toda turma do VDE começa do zero, e o diagnóstico mostra o que ajustar no seu jeito de estudar.</span></div>
      </div>
      <button className="cta" onClick={onComecar}>Descobrir a minha OAB</button>
      <p className="small">Sem cadastro. No fim, você recebe o diagnóstico completo pelo WhatsApp.</p>
    </section>
  )
}
