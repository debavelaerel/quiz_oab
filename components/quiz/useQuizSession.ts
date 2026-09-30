'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Campo, Resp } from '@/lib/oab/fluxo'
import { api, type Utm } from './api'
import { comLetra, comResposta, mesmoEstado, semLetra, semResposta } from './estado'

const CHAVE = 'qo:session'
const guardar = (t: string) => { try { localStorage.setItem(CHAVE, t) } catch { /* sem storage */ } }
const ler = () => { try { return localStorage.getItem(CHAVE) ?? undefined } catch { return undefined } }
const TIMEOUT_START_MS = 6000

/** Data local de São Paulo, só pro caso de a API estar fora (o servidor é quem decide a data). */
function hojeLocal(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  } catch {
    const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
}

/**
 * Estado das respostas + gravação no servidor. Cada mudança manda o snapshot inteiro com `seq`
 * crescente, sem esperar (fire-and-forget): falha de rede é engolida, o finish reenvia tudo.
 */
export function useQuizSession() {
  const [pronto, setPronto] = useState(false)
  const [hoje, setHoje] = useState('')
  const [A, setA] = useState<Resp>({})
  const [teste, setTeste] = useState<string[]>([])
  // Fonte da verdade síncrona (o setState é assíncrono e os handlers precisam do valor novo na hora).
  const r = useRef({ token: '', seq: 0, A: {} as Resp, teste: [] as string[], hoje: '', iniciado: false })
  const origem = useRef<{ utm?: Utm; hoje_override?: string }>({})

  const aplicar = useCallback((novoA: Resp, novoTeste: string[]) => {
    const s = r.current
    // Reescolher a mesma resposta (ex.: ao retomar) não gera escrita.
    if (mesmoEstado(novoA, novoTeste, s.A, s.teste)) return
    s.A = novoA; s.teste = novoTeste; s.seq += 1
    setA(novoA); setTeste(novoTeste)
    if (!s.token) return
    api.answer({ session_token: s.token, seq: s.seq, respostas: novoA, teste: novoTeste }).catch(() => undefined)
  }, [])

  useEffect(() => {
    const s = r.current
    if (s.iniciado) return // StrictMode roda o efeito duas vezes em dev
    s.iniciado = true
    const qs = new URLSearchParams(location.search)
    const utm: Utm = {
      source: qs.get('utm_source'), medium: qs.get('utm_medium'), campaign: qs.get('utm_campaign'),
      content: qs.get('utm_content'), term: qs.get('utm_term'),
    }
    origem.current = { utm, hoje_override: qs.get('hoje') ?? undefined }
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), TIMEOUT_START_MS)
    api.start({ session_token: ler(), ...origem.current }, ctl.signal)
      .then((res) => {
        s.token = res.session_token; s.seq = Math.max(s.seq, res.seq); s.hoje = res.hoje
        guardar(res.session_token)
        if (res.retomada) {
          s.A = res.respostas ?? {}; s.teste = res.teste ?? []
          setA(s.A); setTeste(s.teste)
        }
        setHoje(res.hoje)
      })
      .catch(() => { s.hoje = hojeLocal(); setHoje(s.hoje) }) // o quiz segue sem a API
      .finally(() => { clearTimeout(t); setPronto(true) })
  }, [])

  /** Grava a resposta (limpando o que dependia dela) e devolve o estado novo. */
  const responder = useCallback((k: Campo, v: string): Resp => {
    const novo = comResposta(r.current.A, k, v, r.current.hoje)
    aplicar(novo, r.current.teste)
    return novo
  }, [aplicar])

  const apagar = useCallback((k: Campo): Resp => {
    const novo = semResposta(r.current.A, k)
    aplicar(novo, r.current.teste)
    return novo
  }, [aplicar])
  const responderTeste = useCallback((i: number, letra: string) => { aplicar(r.current.A, comLetra(r.current.teste, i, letra)) }, [aplicar])
  const apagarTeste = useCallback((i: number) => { aplicar(r.current.A, semLetra(r.current.teste, i)) }, [aplicar])

  /** Sessão perdida (404 no finish): abre outra, com as mesmas UTMs, e devolve o token novo. */
  const novaSessao = useCallback(async (): Promise<string> => {
    const res = await api.start(origem.current)
    r.current.token = res.session_token; r.current.seq = res.seq
    guardar(res.session_token)
    return res.session_token
  }, [])

  return {
    pronto, hoje, A, teste, novaSessao,
    token: () => r.current.token,
    snapshot: () => ({ respostas: r.current.A, teste: r.current.teste, seq: r.current.seq }),
    responder, apagar, responderTeste, apagarTeste,
  }
}

export type QuizSession = ReturnType<typeof useQuizSession>
