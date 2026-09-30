'use client'
import { useEffect, useRef } from 'react'
import { track } from './track'

/** Dispara o evento uma vez quando a tela abre (o StrictMode do dev roda o efeito duas vezes). */
export function useTrackAoMontar(ev: string, extra?: Record<string, unknown>): void {
  const feito = useRef(false)
  const dados = useRef(extra)
  useEffect(() => {
    if (feito.current) return
    feito.current = true
    track(ev, dados.current)
  }, [ev])
}
