'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { destinoSeguro } from '@/lib/adminRedirect'
import { Alerta, BTN_PRIMARIO, CAMPO } from '@/components/admin/ui'

function FormularioLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar() {
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setErro(res.status === 429 ? 'Muitas tentativas — aguarde um pouco.' : (json?.erro ?? 'Senha incorreta.'))
        return
      }
      router.replace(destinoSeguro(params.get('proximo')))
      router.refresh()
    } catch {
      setErro('Não foi possível conectar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-6 py-14 sm:items-center sm:py-0">
      <div className="w-full max-w-sm text-center">
        <Image src="/brand/logo-cor.png" alt="Método VDE" width={141} height={40} priority className="mx-auto h-10 w-[141px]" />
        <span className="mt-7 inline-block rounded-full bg-brand-yel px-3 py-1 text-[12px] font-semibold text-brand-roxo-2">Área restrita</span>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.01em]">Painel do Quiz OAB</h1>
        <p className="mt-2 text-[14.5px] text-brand-ink-soft">Entre com a senha do time para ver os leads.</p>

        <form
          className="mt-7 text-left"
          onSubmit={(e) => {
            e.preventDefault()
            void entrar()
          }}
        >
          <label htmlFor="admin-senha" className="sr-only">Senha</label>
          <input
            id="admin-senha"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            aria-invalid={erro ? true : undefined}
            className={`${CAMPO} ${erro ? 'border-brand-red' : ''}`}
          />
          {erro && <Alerta tom="erro" className="mt-3">{erro}</Alerta>}
          <button type="submit" disabled={enviando || senha === ''} className={`${BTN_PRIMARIO} mt-5 w-full py-3.5`}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// useSearchParams exige um limite de Suspense em volta — evita erro de build
// do Next em prerendering estático.
export default function AdminLoginPage() {
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  )
}
