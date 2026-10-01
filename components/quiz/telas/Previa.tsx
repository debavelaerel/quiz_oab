import type { Previa as DadosPrevia } from '../resultado'

type Props = { nome: string; exame: string; p: DadosPrevia; qtdTeste: number; href: string; onClick: () => void }

/** previa(rec): prévia borrada do diagnóstico — títulos legíveis, conteúdo não. */
export function Previa({ nome, exame, p, qtdTeste, href, onClick }: Props) {
  return (
    <div className="peek">
      <div className="pk-doc" aria-hidden="true">
        <div className="pk-top"><span>Diagnóstico · {nome}</span><span>OAB {exame}</span></div>
        <h4>A turma indicada pra você</h4>
        <div className="bl">
          {p.turma ? <div className="pk-kpi"><b>{p.turma.dias} dias</b><span>{p.turma.texto}</span></div> : null}
          {p.turmas.map((x) => <div key={x.dias} className={`pk-row${x.on ? ' on' : ''}`}><b>{x.dias} dias</b><span>{x.rotina}</span></div>)}
        </div>
        <h4>O que os seus erros dizem</h4>
        <div className="bl">{p.sinais.map((s, i) => <p key={i}>{s}</p>)}</div>
        <h4>A correção das {qtdTeste} questões</h4>
        <div className="bl">{p.correcao.map((c) => <div key={c.n} className="pk-q"><b>{c.n}. {c.disciplina}</b><span>{c.comentario}</span></div>)}</div>
      </div>
      <a className="pk-lock" href={href} target="_blank" rel="noopener" onClick={onClick}>
        <div className="pk-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
        <b>Liberado no WhatsApp</b>
        <span>Diagnóstico completo em PDF + o seu plano de ação pra começar agora.</span>
      </a>
    </div>
  )
}
