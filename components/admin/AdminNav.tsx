'use client'

import { usePathname, useRouter } from 'next/navigation'

const ITENS = [{ href: '/admin/leads', label: 'Leads' }]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function sair() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-amber-700">Quiz OAB · Admin</span>
        <nav className="flex flex-1 gap-1">
          {ITENS.map(({ href, label }) => {
            const ativo = pathname === href || pathname.startsWith(href + '/')
            return (
              <a
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${ativo ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {label}
              </a>
            )
          })}
        </nav>
        <button type="button" onClick={() => void sair()} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          Sair
        </button>
      </div>
    </header>
  )
}
