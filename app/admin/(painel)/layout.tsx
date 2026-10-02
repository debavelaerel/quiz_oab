import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import { NOME_COOKIE_ADMIN, verificarSessao } from '@/lib/server/adminAuth'

export const metadata: Metadata = { title: 'Admin · Quiz OAB', robots: { index: false, follow: false } }

export default async function PainelLayout({ children }: { children: ReactNode }) {
  // Defesa em profundidade: o proxy.ts já barra, mas o layout confere de novo.
  const segredo = process.env.ADMIN_SESSION_SECRET
  const cookie = (await cookies()).get(NOME_COOKIE_ADMIN)?.value
  if (!segredo || !verificarSessao(cookie, segredo)) redirect('/admin/login')
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-7 sm:px-6">{children}</main>
    </>
  )
}
