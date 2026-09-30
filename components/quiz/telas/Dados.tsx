'use client'
import { useEffect, useRef, useState } from 'react'
import { formatarWhatsapp } from '@/lib/mascara'
import { CONFIG } from '../copy'
import { camposInvalidos, MSG_CONFERE, MSG_FALHA, type CampoForm, type Form, type ResultadoFinalizar } from '../finalizar'

type Props<R> = { enviar: (f: Form) => Promise<ResultadoFinalizar<R>>; onPronto: (r: R) => void }

// O CSS do original não tem estado de erro por campo; só a borda muda.
const RUIM = { borderColor: '#b42318' }

/** telaDados(): nome, e-mail e WhatsApp liberam o resultado. O que foi digitado nunca se perde. */
export function Dados<R>({ enviar, onPronto }: Props<R>) {
  const [f, setF] = useState<Form>({ nome: '', email: '', whatsapp: '' })
  const [ruins, setRuins] = useState<CampoForm[]>([])
  const [erro, setErro] = useState('')
  const [falhou, setFalhou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const nomeRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setTimeout(() => nomeRef.current?.focus(), 50); return () => clearTimeout(t) }, [])

  const valido = camposInvalidos(f).length === 0
  const mudar = (k: CampoForm, v: string) => {
    setF((x) => ({ ...x, [k]: k === 'whatsapp' ? formatarWhatsapp(v) : v }))
    setRuins((r) => r.filter((c) => c !== k)); setErro('')
  }
  // Com a regra do servidor (nome e sobrenome, celular com 9), avisa ao sair do campo em vez de só travar o botão.
  const conferir = (k: CampoForm) => {
    if (f[k].trim() && camposInvalidos(f).includes(k)) { setRuins((r) => (r.includes(k) ? r : [...r, k])); setErro(MSG_CONFERE) }
  }

  const ok = async () => {
    if (enviando) return
    const inval = camposInvalidos(f)
    if (inval.length) { setRuins(inval); setErro(MSG_CONFERE); return }
    setEnviando(true); setErro('')
    const r = await enviar(f)
    setEnviando(false)
    if (r.tipo === 'ok') { onPronto(r.resultado); return }
    if (r.tipo === 'campos') { setRuins(r.campos); setErro(MSG_CONFERE); setFalhou(false); return }
    setErro(MSG_FALHA); setFalhou(true)
  }

  const campo = (k: CampoForm) => ({
    value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => mudar(k, e.target.value), onBlur: () => conferir(k),
    'aria-invalid': ruins.includes(k) || undefined, style: ruins.includes(k) ? RUIM : undefined,
  })

  return (
    <section className="screen form">
      <h2 className="q center">O seu diagnóstico está pronto</h2>
      <p className="hint center">Preencha os dados abaixo pra liberar o seu resultado e descobrir qual é a sua OAB.</p>
      <label className="lbl" htmlFor="f-nome">Nome</label>
      <input ref={nomeRef} className="field" id="f-nome" autoComplete="name" placeholder="Digite o seu nome" maxLength={80} {...campo('nome')} />
      <label className="lbl" htmlFor="f-email">E-mail</label>
      <input className="field" id="f-email" type="email" inputMode="email" autoComplete="email" placeholder="seu.melhor@email.com" maxLength={120} {...campo('email')} />
      <label className="lbl" htmlFor="f-tel">WhatsApp</label>
      <input className="field" id="f-tel" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="(DDD) 90000-0000" {...campo('whatsapp')} />
      <p className="err" role="alert" hidden={!erro}>{erro}</p>
      <button className="cta yel" disabled={!valido || enviando} onClick={ok}>
        {falhou ? 'Tentar novamente' : 'Ver o meu resultado agora →'}
      </button>
      <p className="small">
        {CONFIG.privacidadeTxt}
        {CONFIG.privacidadeUrl ? <> <a href={CONFIG.privacidadeUrl} target="_blank" rel="noopener">Política de privacidade</a>.</> : null}
      </p>
    </section>
  )
}
