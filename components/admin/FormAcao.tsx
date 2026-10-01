'use client'

import { useState } from 'react'

/** Form POST de uma ação do admin que desabilita o botão ao enviar (evita clique duplo). */
export default function FormAcao({ action, rotulo, rotuloEnviando, className }: {
  action: string; rotulo: string; rotuloEnviando: string; className?: string
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <form
      method="post"
      action={action}
      onSubmit={(e) => {
        if (enviando) e.preventDefault()
        else setEnviando(true)
      }}
    >
      <button type="submit" disabled={enviando} className={`${className ?? ''} disabled:opacity-50`}>
        {enviando ? rotuloEnviando : rotulo}
      </button>
    </form>
  )
}
