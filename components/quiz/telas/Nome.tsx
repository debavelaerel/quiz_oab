'use client'
import { useEffect, useRef, useState } from 'react'
import { nomeCurtoValido } from '@/lib/validacao'

export const MSG_NOME = 'Digite o seu primeiro nome.'

type Props = { inicial: string; onContinuar: (nome: string) => void }

/** "Como podemos te chamar?": a primeira informação pedida; só o primeiro nome ou apelido. */
export function Nome({ inicial, onContinuar }: Props) {
  const [nome, setNome] = useState(inicial)
  const [tocado, setTocado] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 50); return () => clearTimeout(t) }, [])
  const valido = nomeCurtoValido(nome)
  const enviar = (e: React.FormEvent) => { e.preventDefault(); if (valido) onContinuar(nome.trim()) }

  return (
    <section className="screen nm form2">
      <span className="pill">Antes de começar</span>
      <h1>Como podemos te chamar?</h1>
      <p className="apoio">Assim a gente deixa o quiz com a sua cara.</p>
      <form onSubmit={enviar} noValidate>
        <div className="campos um">
          <label htmlFor="f-nome" className="sro">Seu nome</label>
          <div>
            <input
              ref={ref} id="f-nome" className="field2" autoComplete="given-name" maxLength={80}
              placeholder="Seu primeiro nome" value={nome} onChange={(e) => setNome(e.target.value)}
              onBlur={() => setTocado(true)} aria-invalid={tocado && !valido ? true : undefined}
            />
            {tocado && !valido ? <p className="msg-campo" role="alert">{MSG_NOME}</p> : null}
          </div>
        </div>
        <button className="cta yel" type="submit" disabled={!valido}>Começar o quiz →</button>
      </form>
    </section>
  )
}
