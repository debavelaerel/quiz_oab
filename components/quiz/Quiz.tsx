'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { proxima, totalPassos, type Campo, type Resp } from '@/lib/oab/fluxo'
import { Avanco } from './avanco'
import { P, QTD_TESTE } from './copy'
import {
  ehPergunta, indicePergunta, indiceTeste, irPara, navInicial, podeVoltar, progresso, telaAtual, voltar,
  type Nav, type Tela,
} from './navegacao'
import { track } from './track'
import { useQuizSession } from './useQuizSession'
import { EmConstrucao } from './telas/EmConstrucao'
import { Intro } from './telas/Intro'
import { Pergunta } from './telas/Pergunta'
import { PerguntaMulti } from './telas/PerguntaMulti'

const ATRASO_MS = 160 // o original espera isso depois de marcar a opção, pra pessoa ver a seleção

/** `A` é o estado das respostas no momento em que a tela abriu (como o innerHTML do original). */
type Vista = { nav: Nav; A: Resp }

export function Quiz() {
  const s = useQuizSession()
  const [vista, setVista] = useState<Vista>({ nav: navInicial, A: {} })
  const [querComecar, setQuerComecar] = useState(false)
  const avanco = useRef(new Avanco()).current
  const larguraBarra = useRef(0)
  const tela = telaAtual(vista.nav)
  const { hoje } = s

  const ir = useCallback((t: Tela, A: Resp) => {
    setVista((v) => ({ nav: irPara(v.nav, t), A }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Tela nova: libera o próximo avanço. Desmontar: descarta o avanço adiado.
  useEffect(() => { avanco.liberar() }, [vista.nav.hist.length, avanco])
  useEffect(() => () => avanco.cancelar(), [avanco])

  // A data vem do servidor: o botão da intro espera o /start responder (ou falhar).
  useEffect(() => {
    if (querComecar && s.pronto) { setQuerComecar(false); ir(proxima('intro', s.A, hoje), s.A) }
  }, [querComecar, s.pronto, s.A, hoje, ir])

  const onVoltar = () => {
    const { nav, saindo } = voltar(vista.nav)
    if (!saindo) return
    avanco.cancelar() // senão o avanço adiado (160 ms) navegaria com as respostas de antes do "voltar"
    let A = s.A
    if (ehPergunta(saindo)) A = s.apagar(saindo)
    else if (indiceTeste(saindo) >= 0) s.apagarTeste(indiceTeste(saindo))
    setVista({ nav, A })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const escolher = (k: Campo, v: string) => {
    if (!avanco.livre) return
    const A = s.responder(k, v)
    track('quiz_answer', { pergunta: k, resposta: v })
    avanco.agendar(() => ir(proxima(k, A, hoje), A), ATRASO_MS)
  }

  const confirmar = (k: Campo, v: string) => {
    avanco.agendar(() => {
      const A = s.responder(k, v)
      track('quiz_answer', { pergunta: k, resposta: v })
      ir(proxima(k, A, hoje), A)
    })
  }

  const pct = progresso(tela, vista.A, hoje, QTD_TESTE)
  if (pct !== null) larguraBarra.current = pct

  return (
    <>
      <div className="bar"><header className="top">
        <span className="logo" role="img" aria-label="Método VDE, OAB 1ª fase" />
        <button className="back" hidden={!podeVoltar(vista.nav)} onClick={onVoltar}>← Voltar</button>
      </header></div>
      <div className="progress" hidden={pct === null}>
        <div className="track"><div className="fill" style={{ width: `${larguraBarra.current}%` }} /></div>
      </div>
      <main key={vista.nav.hist.length + tela}>{renderTela()}</main>
    </>
  )

  function renderTela() {
    if (tela === 'intro') {
      return <Intro esperando={querComecar} onComecar={() => { if (querComecar) return; track('quiz_start'); setQuerComecar(true) }} />
    }
    if (ehPergunta(tela)) {
      const props = { k: tela, A: vista.A, hoje, idx: indicePergunta(tela, vista.A, hoje), total: totalPassos(vista.A, hoje) }
      return P[tela].multi
        ? <PerguntaMulti {...props} onConfirmar={(v) => confirmar(tela, v)} />
        : <Pergunta {...props} onEscolher={(v) => escolher(tela, v)} />
    }
    const i = indiceTeste(tela)
    if (i >= 0) {
      return (
        <EmConstrucao tela={tela} rotulo="Não sei responder" onAvancar={() => {
          s.responderTeste(i, 'X')
          ir(i + 1 < QTD_TESTE ? (`t${i + 1}` as Tela) : 'dados', s.A)
        }} />
      )
    }
    if (tela === 'parte2') return <EmConstrucao tela={tela} rotulo="Começar o teste" onAvancar={() => ir('t0', s.A)} />
    if (tela === 'dados') return <EmConstrucao tela={tela} onAvancar={() => ir('resultado', s.A)} />
    return <EmConstrucao tela={tela} />
  }
}
