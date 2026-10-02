import type { ReactNode } from 'react'
// Poppins (mesmos arquivos do quiz, servidos de /fonts). Vale para o login e para o painel.
import '../(quiz)/fonts.css'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-brand-bg font-brand text-[14.5px] text-brand-ink antialiased">{children}</div>
}
