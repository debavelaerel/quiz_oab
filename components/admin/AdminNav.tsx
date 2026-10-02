'use client'

import Image from 'next/image'
import Link from 'next/link'
import { PieChart, Users } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { FOCO } from './ui'

const ITENS = [
  { href: '/admin/leads', label: 'Leads', Icone: Users },
  { href: '/admin/analytics', label: 'Analytics', Icone: PieChart },
]

/** Barra de topo no roxo profundo do quiz, com o logotipo branco. */
export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function sair() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    router.replace('/admin/login')
    router.refresh()
  }

  const item = `rounded-2xl px-3.5 py-2 text-[14.5px] font-medium transition-colors ${FOCO} focus-visible:ring-white/40`

  return (
    <header className="bg-brand-roxo-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/admin/leads" className={`flex items-center gap-3 rounded-lg ${FOCO} focus-visible:ring-white/40`} aria-label="Método VDE, painel do Quiz OAB">
          <Image src="/brand/logo-branco.png" alt="Método VDE" width={118} height={34} priority className="h-[34px] w-[120px]" />
          <span className="hidden rounded-full bg-brand-yel px-3 py-1 text-[12px] font-semibold text-brand-roxo-2 sm:inline-block">Painel</span>
        </Link>
        <nav className="flex flex-1 gap-1" aria-label="Principal">
          {ITENS.map(({ href, label, Icone }) => {
            const ativo = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`${item} inline-flex items-center gap-2 ${ativo ? 'bg-white/15 text-white' : 'text-brand-line hover:bg-white/10 hover:text-white'}`}
              >
                <Icone size={16} strokeWidth={2.25} aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
        <button type="button" onClick={() => void sair()} className={`${item} text-brand-line hover:bg-white/10 hover:text-white`}>
          Sair
        </button>
      </div>
    </header>
  )
}
