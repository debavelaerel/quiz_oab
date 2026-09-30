'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// `?proximo=` vem da URL, então é entrada não-confiável. Só aceita um path
// interno (começa com uma única "/", nunca "//" — que o navegador trata como
// protocol-relative pra outro host — nem barra invertida). Sem essa checagem,
// um link tipo /admin/login?proximo=https://look-alike.com te loga de
// verdade e manda pra uma cópia phishing pedindo a senha nesse outro host
// (open redirect).
export function destinoSeguro(proximo: string | null): string {
  if (!proximo) return '/admin/leads'
  if (!proximo.startsWith('/') || proximo.startsWith('//') || proximo.includes('\\')) return '/admin/leads'
  return proximo
}

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-amber-700">Quiz OAB</p>
        <h1 className="mt-3 text-xl font-bold leading-tight tracking-[-0.01em] text-slate-900">Painel administrativo</h1>
        <p className="mt-2 text-[14px] text-slate-600">Área restrita ao time do Quiz OAB.</p>

        <form
          className="mt-7 text-left"
          onSubmit={(e) => {
            e.preventDefault()
            void entrar()
          }}
        >
          <label htmlFor="admin-senha" className="mb-1.5 block text-[14.5px] font-medium text-slate-600">Senha</label>
          <input
            id="admin-senha"
            type="password"
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-[14px] border-[1.5px] border-slate-300 bg-white px-4 py-4 text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
          />
          {erro && <p role="alert" className="mt-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">{erro}</p>}
          <button
            type="submit"
            disabled={enviando || senha === ''}
            className="mt-5 w-full rounded-full bg-slate-900 px-6 py-4 text-[15.5px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-45"
          >
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
