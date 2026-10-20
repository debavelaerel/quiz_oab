'use client'
import type { Resp } from '@/lib/oab/fluxo'
import { ofertaAnual } from '@/lib/oab/oferta'
import type { Resultado as DadosResultado } from '../api'
import { br } from '../copy'
import { acertos, brc, diasAteProva, exameDe, TESTE } from '../resultado'
import { track } from '../track'
import { useDiagnostico } from '../useDiagnostico'
import { useTrackAoMontar } from '../useTrackAoMontar'

type Props = { inicial: DadosResultado; A: Resp; teste: string[]; token: string | null }

// Texto provisório da anual: trocar quando o time do VDE definir a copy oficial.
const TITULO_ANUAL = {
  oab50: 'Pra OAB 50, a nossa indicação é a turma anual',
  reprovou_varias: 'Uma segunda opção pra você: a turma anual',
  sem_produto: 'Pra você, a nossa indicação é a turma anual',
}
const TEXTO_ANUAL = {
  oab50: 'As turmas da OAB 50 demoram a abrir. Com a anual você começa a se preparar já, sem esperar.',
  reprovou_varias: 'Como você já fez a 1ª fase mais de uma vez, vale conhecer a anual: um preparo mais longo, pra construir a base com calma.',
  sem_produto: 'No momento não há turma comum à venda pra sua prova. A anual deixa você começar a se preparar já.',
}

/**
 * resultado(): o que o /finish devolveu (o cliente não recalcula a recomendação). A tela não tem botão
 * de WhatsApp: o lead baixa o diagnóstico em PDF aqui mesmo (o botão espera a geração terminar).
 */
export function Resultado({ inicial, A, teste, token }: Props) {
  const diag = useDiagnostico(inicial.diagnostico, token)
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
          <p className="when">Nossa equipe vai entrar em contato com uma orientação para a sua próxima prova.</p></div>
        <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
      </section>
    )
  }

  const e = exameDe(exame)
  const hoje = res.hoje
  const itensPdf = [
    'A turma indicada pra você e a rotina de estudo',
    'O que os seus erros dizem sobre o seu preparo',
    'A correção comentada das 5 questões',
  ]
  const anual = ofertaAnual(A as Record<string, string>, rec)
  const cardAnual = anual && (
    <div className="box"><h2>{TITULO_ANUAL[anual.motivo]}</h2><p>{TEXTO_ANUAL[anual.motivo]}</p></div>
  )
  return (
    <section className="screen">
      <div className="res">
        <p className="hi">{nome}, a OAB da sua aprovação é a</p>
        <div className="big"><span>OAB</span><span className="num">{e.id}</span></div>
        <p className="when">1ª fase em <b>{br(e.fase1)}</b>, daqui a <b>{diasAteProva(exame, hoje)} dias</b>.</p>
        <div className="chips"><span className="chip">prova em {e.mes}</span><span className="chip p">2ª fase em {brc(e.fase2)}</span><span className="chip">teste: {acertos(teste)} de {TESTE.length}</span></div>
      </div>
      {diag.status === 'pronto' && diag.url ? (
        <>
          <div className="aviso ok" role="status">
            <b>Seu diagnóstico completo está pronto</b>
            <span>Baixe o PDF com o seu resultado, a correção do teste e o plano de ação pra começar agora.</span>
          </div>
          <a className="cta yel" href={diag.url} download onClick={() => track('quiz_download', { exame })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></svg>
            Baixar meu diagnóstico (PDF)
          </a>
        </>
      ) : diag.status === 'pendente' ? (
        <>
          <div className="aviso" role="status">
            <b>Estamos montando o seu diagnóstico</b>
            <span>Leva alguns segundos. O botão de download libera aqui mesmo, não feche esta tela.</span>
          </div>
          <button className="cta yel" type="button" disabled>Gerando seu PDF…</button>
        </>
      ) : (
        <div className="aviso" role="status">
          <b>Não conseguimos gerar o seu PDF agora</b>
          <span>Nossa equipe vai te enviar o diagnóstico completo e o plano de ação.</span>
        </div>
      )}
      {anual?.posicao !== 'segunda' && cardAnual}
      {anual?.posicao === 'segunda' && cardAnual}
      <div className="next">
        <p className="next-t">Dentro do PDF:</p>
        {itensPdf.map((t, n) => <div key={t} className="next-i"><span className="num">{n + 1}</span><p>{t}</p></div>)}
      </div>
      <button className="restart" onClick={() => location.reload()}>Refazer o quiz</button>
    </section>
  )
}
