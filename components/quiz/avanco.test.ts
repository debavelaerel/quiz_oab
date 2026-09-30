import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Avanco } from './avanco'

describe('Avanco', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('"voltar" dentro dos 160 ms cancela o avanço adiado (corrida escolher → voltar)', () => {
    const av = new Avanco(), ir = vi.fn()
    expect(av.agendar(ir, 160)).toBe(true)
    expect(av.pendente).toBe(true)
    vi.advanceTimersByTime(100)
    av.cancelar() // onVoltar
    vi.advanceTimersByTime(500)
    expect(ir).not.toHaveBeenCalled()
    expect(av.pendente).toBe(false)
  })

  it('sem voltar, o avanço adiado acontece uma vez', () => {
    const av = new Avanco(), ir = vi.fn()
    av.agendar(ir, 160)
    vi.advanceTimersByTime(160)
    expect(ir).toHaveBeenCalledTimes(1)
  })

  it('clique duplo não avança duas vezes, nem adiado nem imediato', () => {
    const av = new Avanco(), ir = vi.fn()
    expect(av.agendar(ir, 160)).toBe(true)
    expect(av.livre).toBe(false)
    expect(av.agendar(ir, 160)).toBe(false)
    vi.advanceTimersByTime(500)
    expect(ir).toHaveBeenCalledTimes(1)
    const av2 = new Avanco(), ir2 = vi.fn()
    av2.agendar(ir2); av2.agendar(ir2)
    expect(ir2).toHaveBeenCalledTimes(1)
  })

  it('tela nova (liberar) ou voltar (cancelar) destravam', () => {
    const av = new Avanco(), ir = vi.fn()
    av.agendar(ir); av.liberar(); av.agendar(ir)
    expect(ir).toHaveBeenCalledTimes(2)
    av.cancelar(); av.agendar(ir)
    expect(ir).toHaveBeenCalledTimes(3)
  })
})
