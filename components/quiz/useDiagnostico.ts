'use client'
import { useEffect, useState } from 'react'
import { api, type Resultado } from './api'

type Diagnostico = Resultado['diagnostico']

const INTERVALO_MS = 3000
const TENTATIVAS_MAX = 30 // ~90 s: mais que isso o servidor já marca o diagnóstico como erro

/** Estado do PDF: parte do que o /finish devolveu e, enquanto estiver pendente, consulta /result até ficar pronto. */
export function useDiagnostico(inicial: Diagnostico, token: string | null): Diagnostico {
  const [d, setD] = useState<Diagnostico>(inicial)
  useEffect(() => {
    if (!token || inicial.status !== 'pendente') return
    let vivo = true
    let n = 0
    const t = setInterval(async () => {
      n += 1
      try {
        const r = await api.resultado(token)
        if (!vivo) return
        setD(r.diagnostico)
        if (r.diagnostico.status !== 'pendente') clearInterval(t)
      } catch { /* tenta de novo no próximo ciclo */ }
      if (n >= TENTATIVAS_MAX) clearInterval(t)
    }, INTERVALO_MS)
    return () => { vivo = false; clearInterval(t) }
  }, [token, inicial.status])
  return d
}
