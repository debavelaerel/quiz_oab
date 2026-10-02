'use client'
import type { Resp } from '@/lib/oab/fluxo'
import type { Resultado as DadosResultado } from '../api'
import { br } from '../copy'
import { acertos, brc, diasAteProva, exameDe, itensDiagnostico, previaDe, TESTE } from '../resultado'
import { useTrackAoMontar } from '../useTrackAoMontar'
import { Previa } from './Previa'

type Props = { inicial: DadosResultado; A: Resp; teste: string[] }

/**
 * resultado(): o que o /finish devolveu (o cliente não recalcula a recomendação). A tela não tem botão
 * de WhatsApp nem de download: o time do VDE envia o diagnóstico completo pelo WhatsApp do lead.
 */
export function Resultado({ inicial, A, teste }: Props) {
  const res = inicial
  const rec = res.recomendacao
  const exame = 'exame' in rec ? rec.exame : ''
  const turma = 'turma' in rec ? rec.turma : undefined
  const nome = res.nome ?? ''

  useTrackAoMontar('quiz_result', { tipo: rec.tipo, exame, turma: turma ?? '' })

  if (!exame) {
    return (
      <section className="screen">
        <div className="res"><h2 className="q">Obrigada por responder, {nome}!</h2>
          <p className="when">Nossa equipe vai te enviar uma orientação para a sua próxima prova no seu WhatsApp.</p></div>
        <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
      </section>
    )
  }

  const e = exameDe(exame)
  const hoje = res.hoje
  return (
    <section className="screen">
      <div className="res">
        <p className="hi">{nome}, a OAB da sua aprovação é a</p>
        <div className="big"><span>OAB</span><span className="num">{e.id}</span></div>
        <p className="when">1ª fase em <b>{br(e.fase1)}</b>, daqui a <b>{diasAteProva(exame, hoje)} dias</b>.</p>
        <div className="chips"><span className="chip">prova em {e.mes}</span><span className="chip p">2ª fase em {brc(e.fase2)}</span><span className="chip">teste: {acertos(teste)} de {TESTE.length}</span></div>
      </div>
      <div className="aviso" role="status">
        <b>Nossa equipe vai te enviar o seu resultado no WhatsApp</b>
        <span>Fique de olho nas mensagens: o diagnóstico completo e o plano de ação chegam por lá.</span>
      </div>
      <div className="box"><h2>O seu diagnóstico completo já está pronto</h2>
        <ul>{itensDiagnostico(A, exame, hoje).map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
      <Previa nome={nome} exame={e.id} p={previaDe({ exame, turma }, teste, hoje)} qtdTeste={TESTE.length} />
      <div className="next">
        <p className="next-t">No WhatsApp, o time do VDE te entrega:</p>
        <div className="next-i"><span className="num">1</span><p><b>O seu diagnóstico completo</b>, em PDF, com a correção do teste.</p></div>
        <div className="next-i"><span className="num">2</span><p><b>Um plano de ação pra você começar AGORA</b> a se preparar pra {e.nome}: por onde começar, em que ordem e como encaixar na sua semana.</p></div>
      </div>
      <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
    </section>
  )
}
