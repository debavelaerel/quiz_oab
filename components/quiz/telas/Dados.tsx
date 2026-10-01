'use client'
import { useRef, useState } from 'react'
import { formatarWhatsapp } from '@/lib/mascara'
import { emailValido, whatsappValido } from '@/lib/validacao'
import { CONFIG, tituloContato } from '../copy'
import {
  camposInvalidos, MSG_EMAIL, MSG_FALHA, MSG_WHATSAPP, type CampoForm, type Form, type ResultadoFinalizar,
} from '../finalizar'

type Props<R> = {
  nome: string
  enviar: (f: Form) => Promise<ResultadoFinalizar<R>>
  onPronto: (r: R) => void
  onFaltaNome: () => void
}

const MSG: Record<CampoForm, string> = { whatsapp: MSG_WHATSAPP, email: MSG_EMAIL }

/** Tela final: e-mail e WhatsApp liberam o resultado. O que foi digitado nunca se perde. */
export function Dados<R>({ nome, enviar, onPronto, onFaltaNome }: Props<R>) {
  const [f, setF] = useState<Form>({ whatsapp: '', email: '' })
  const [tocados, setTocados] = useState<CampoForm[]>([])
  const [erro, setErro] = useState('')
  const [falhou, setFalhou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const emVoo = useRef(false)

  const valido = camposInvalidos(f).length === 0
  const mudar = (k: CampoForm, v: string) => { setF((x) => ({ ...x, [k]: k === 'whatsapp' ? formatarWhatsapp(v) : v })); setErro('') }
  const tocar = (k: CampoForm) => setTocados((t) => (t.includes(k) ? t : [...t, k]))
  const invalido = (k: CampoForm) => tocados.includes(k) && (k === 'whatsapp' ? !whatsappValido(f.whatsapp) : !emailValido(f.email))

  const ok = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emVoo.current) return
    if (!valido) { setTocados(['whatsapp', 'email']); return }
    emVoo.current = true; setEnviando(true); setErro('')
    const r = await enviar(f)
    emVoo.current = false; setEnviando(false)
    if (r.tipo === 'ok') { onPronto(r.resultado); return }
    if (r.tipo === 'nome') { onFaltaNome(); return }
    if (r.tipo === 'campos') { setTocados((t) => [...new Set([...t, ...r.campos])]); setFalhou(false); return }
    setErro(MSG_FALHA); setFalhou(true)
  }

  const campo = (k: CampoForm) => ({
    value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => mudar(k, e.target.value), onBlur: () => tocar(k),
    'aria-invalid': invalido(k) ? true : undefined,
  })

  return (
    <section className="screen form2">
      <h1 className="ct">{tituloContato(nome)}</h1>
      <form onSubmit={ok} noValidate>
        <div className="campos">
          <div>
            <label htmlFor="f-tel" className="sro">WhatsApp</label>
            <input id="f-tel" className="field2" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 91234-5678" {...campo('whatsapp')} />
            {invalido('whatsapp') ? <p className="msg-campo" role="alert">{MSG.whatsapp}</p> : null}
          </div>
          <div>
            <label htmlFor="f-email" className="sro">E-mail</label>
            <input id="f-email" className="field2" type="email" inputMode="email" autoComplete="email" placeholder="Seu melhor e-mail" maxLength={120} {...campo('email')} />
            {invalido('email') ? <p className="msg-campo" role="alert">{MSG.email}</p> : null}
          </div>
        </div>
        <p className="msg-campo" role="alert" hidden={!erro}>{erro}</p>
        <button className="cta yel" type="submit" disabled={!valido || enviando}>
          {falhou ? 'Tentar novamente' : 'Ver o meu resultado agora →'}
        </button>
        <p className="small">
          {CONFIG.privacidadeTxt}
          {CONFIG.privacidadeUrl ? <> <a href={CONFIG.privacidadeUrl} target="_blank" rel="noopener">Política de privacidade</a>.</> : null}
        </p>
      </form>
    </section>
  )
}
