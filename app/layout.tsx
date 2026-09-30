import type { ReactNode } from 'react'
import './globals.css'

export const metadata = { title: 'Qual a OAB da sua aprovação em 2027?' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
