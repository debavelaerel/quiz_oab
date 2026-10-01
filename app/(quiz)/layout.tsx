import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './fonts.css'
import './quiz.css'
import './form.css'

export const metadata: Metadata = {
  title: 'Qual a OAB da sua aprovação em 2027? | Método VDE',
  description:
    'Veja qual é a OAB ideal pra você se preparar em 2027 (OAB 48, 49 ou 50) com base no semestre que você está cursando, no seu tempo disponível e no seu nível de conhecimento.',
  robots: { index: false },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

/** Todo o CSS do quiz é escopado em `.qz` (ver scripts/gen-quiz-css.mjs): nada vaza pro /admin. */
export default function QuizLayout({ children }: { children: ReactNode }) {
  return <div className="qz">{children}</div>
}
