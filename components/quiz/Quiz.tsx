'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { proxima, totalPassos, type Campo, type Resp } from '@/lib/oab/fluxo'
import { api, type Resultado as DadosResultado } from './api'
import { Avanco } from './avanco'
import { P, QTD_TESTE } from './copy'
import {
  ehPergunta, indicePergunta, indiceTeste, irPara, navInicial, podeVoltar, progresso, telaAtual, voltar,
  type Nav, type Tela,
} from './navegacao'
import { contatoDe, finalizar, type Form } from './finalizar'
import { TESTE } from './resultado'
import { track } from './track'
import { useQuizSession } from './useQuizSession'
import { Cedo } from './telas/Cedo'
import { Dados } from './telas/Dados'
import { F2 } from './telas/F2'
import { Intro } from './telas/Intro'
import { Parte2 } from './telas/Parte2'
import { Pergunta } from './telas/Pergunta'
import { PerguntaMulti } from './telas/PerguntaMulti'
import { Questao } from './telas/Questao'
import { Resultado } from './telas/Resultado'

const ATRASO_MS = 160 // o original espera isso depois de marcar a opção, pra pessoa ver a seleção

/** `A` é o estado das respostas no momento em que a tela abriu (como o innerHTML do original). */
type Vista = { nav: Nav; A: Resp }

export function Quiz() {
  const s = useQuizSession()
  const [vista, setVista] = useState<Vista>({ nav: navInicial, A: {} })
  const [querComecar, setQuerComecar] = useState(false)
  const [resultado, setResultado] = useState<DadosResultado | null>(null)
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

  const responderQuestao = (i: number, letra: string) => {
    avanco.agendar(() => {
      s.responderTeste(i, letra)
      track('quiz_teste', { questao: TESTE[i].id, resposta: letra, acertou: letra === TESTE[i].gabarito })
      ir(i + 1 < QTD_TESTE ? (`t${i + 1}` as Tela) : 'dados', s.A)
    })
  }

  // O finish leva o snapshot inteiro (respostas + teste) do momento do clique.
  const enviarDados = (f: Form) => finalizar<DadosResultado>({
    token: s.token(),
    novaSessao: s.novaSessao,
    enviar: (token) => {
      const { respostas, teste } = s.snapshot()
      return api.finish({ session_token: token, respostas, teste, contato: contatoDe(f), consentimento: true })
    },
  })

  const pct = progresso(tela, vista.A, hoje, QTD_TESTE)
  if (pct !== null) larguraBarra.current = pct

  return (
    <>
      <div className="bar"><header className="top">
        <span className="logo" role="img" aria-label="Método VDE, OAB 1ª fase" />
        <button className="back" hidden={!podeVoltar(vista.nav) || tela === 'resultado'} onClick={onVoltar}>← Voltar</button>
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
      return <Questao i={i} inicial={s.teste[i]} onMarcar={(l) => s.responderTeste(i, l)} onConfirmar={(l) => responderQuestao(i, l)} />
    }
    if (tela === 'parte2') return <Parte2 onComecar={() => avanco.agendar(() => ir('t0', s.A))} />
    if (tela === 'dados') {
      return <Dados enviar={enviarDados} onPronto={(r) => { track('quiz_lead'); setResultado(r); ir('resultado', s.A) }} />
    }
    if (tela === 'cedo') return <Cedo A={vista.A} hoje={hoje} />
    if (tela === 'f2') return <F2 />
    // resultado: só se chega aqui depois de um finish aceito
    return resultado ? <Resultado inicial={resultado} A={s.A} teste={s.teste} token={s.token()} /> : null
  }
}
