'use client'
import { useEffect, useState } from 'react'
import type { Resp } from '@/lib/oab/fluxo'
import { api, type Resultado as DadosResultado } from '../api'
import { br, CONFIG } from '../copy'
import { consultarDiagnostico, vistaDiagnostico } from '../diagnostico'
import { acertos, brc, diasAteProva, exameDe, itensDiagnostico, linkWhatsApp, previaDe, TESTE } from '../resultado'
import { track } from '../track'
import { useTrackAoMontar } from '../useTrackAoMontar'
import { Previa } from './Previa'

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" /></svg>
)

type Props = { inicial: DadosResultado; A: Resp; teste: string[]; token: string }

/** resultado(): o que o /finish devolveu (o cliente não recalcula a recomendação) + o PDF do diagnóstico. */
export function Resultado({ inicial, A, teste, token }: Props) {
  const [res, setRes] = useState(inicial)
  const [esgotou, setEsgotou] = useState(false)
  const rec = res.recomendacao
  const exame = 'exame' in rec ? rec.exame : ''
  const turma = 'turma' in rec ? rec.turma : undefined
  const nome = res.nome ?? ''
  const href = linkWhatsApp(CONFIG.whatsapp, { nome, rec, ref: res.ref_curta })

  useTrackAoMontar('quiz_result', { tipo: rec.tipo, exame, turma: turma ?? '' })

  // Enquanto o PDF está sendo gerado, pergunta de novo a cada 3 s (até 20 vezes); para ao desmontar.
  const pendenteNoInicio = inicial.diagnostico.status === 'pendente'
  useEffect(() => {
    if (!pendenteNoInicio || !token) return
    return consultarDiagnostico({ buscar: () => api.result(token), aoAtualizar: setRes, aoEsgotar: () => setEsgotou(true) })
  }, [pendenteNoInicio, token])

  const clicouWhatsApp = (origem?: string) => {
    if (token) api.whatsapp(token).catch(() => undefined)
    track('quiz_whatsapp', origem ? { origem } : { exame })
  }

  if (!exame) {
    return (
      <section className="screen">
        <div className="res"><h2 className="q">Obrigada por responder, {nome}!</h2>
          <p className="when">Chama a gente no WhatsApp que o time te ajuda a planejar a sua próxima prova.</p></div>
        <a className="cta wa" href={href} target="_blank" rel="noopener" onClick={() => clicouWhatsApp()}>{WA_ICON}Falar com o time do VDE</a>
      </section>
    )
  }

  const e = exameDe(exame)
  const hoje = res.hoje
  const diag = vistaDiagnostico(res.diagnostico, esgotou)
  return (
    <section className="screen">
      <div className="res">
        <p className="hi">{nome}, a OAB da sua aprovação é a</p>
        <div className="big"><span>OAB</span><span className="num">{e.id}</span></div>
        <p className="when">1ª fase em <b>{br(e.fase1)}</b>, daqui a <b>{diasAteProva(exame, hoje)} dias</b>.</p>
        <div className="chips"><span className="chip">prova em {e.mes}</span><span className="chip p">2ª fase em {brc(e.fase2)}</span><span className="chip">teste: {acertos(teste)} de {TESTE.length}</span></div>
      </div>
      <div className="box"><h2>O seu diagnóstico completo já está pronto</h2>
        <ul>{itensDiagnostico(A, exame, hoje).map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
      {diag === 'baixar' ? (
        <a className="cta" href={res.diagnostico.url!} target="_blank" rel="noopener" onClick={() => track('quiz_download')}>Baixar meu diagnóstico</a>
      ) : (
        <>
          {diag === 'preparando' ? <p className="small" role="status">Preparando seu diagnóstico…</p> : null}
          {diag === 'whatsapp' ? <p className="small" role="status">Vamos te enviar o diagnóstico pelo WhatsApp</p> : null}
          <Previa nome={nome} exame={e.id} p={previaDe({ exame, turma }, teste, hoje)} qtdTeste={TESTE.length} href={href} onClick={() => clicouWhatsApp('previa')} />
        </>
      )}
      <div className="next">
        <p className="next-t">No WhatsApp, o time do VDE te entrega:</p>
        <div className="next-i"><span className="num">1</span><p><b>O seu diagnóstico completo</b>, em PDF, com a correção do teste.</p></div>
        <div className="next-i"><span className="num">2</span><p><b>Um plano de ação pra você começar AGORA</b> a se preparar pra {e.nome}: por onde começar, em que ordem e como encaixar na sua semana.</p></div>
      </div>
      <a className="cta wa" href={href} target="_blank" rel="noopener" onClick={() => clicouWhatsApp()}>{WA_ICON}Quero o meu diagnóstico e o meu plano</a>
      <p className="small">É só mandar a mensagem que já vai pronta. A conversa é com o time do VDE.</p>
      <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
    </section>
  )
}
