import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarDiagnostico, vistaDiagnostico } from './diagnostico'

describe('vistaDiagnostico', () => {
  it('pronto com url → baixar', () => expect(vistaDiagnostico({ status: 'pronto', url: '/api/diagnostico/x' }, false)).toBe('baixar'))
  it('pronto sem url → whatsapp (não mostra botão quebrado)', () => expect(vistaDiagnostico({ status: 'pronto', url: null }, false)).toBe('whatsapp'))
  it('pendente → preparando; depois de esgotar → whatsapp', () => {
    expect(vistaDiagnostico({ status: 'pendente', url: null }, false)).toBe('preparando')
    expect(vistaDiagnostico({ status: 'pendente', url: null }, true)).toBe('whatsapp')
  })
  it('erro, desligado e nulo → whatsapp', () => {
    for (const status of ['erro', 'desligado', null]) expect(vistaDiagnostico({ status, url: null }, false)).toBe('whatsapp')
  })
  it('nao_se_aplica → nenhum', () => expect(vistaDiagnostico({ status: 'nao_se_aplica', url: null }, false)).toBe('nenhum'))
})

describe('consultarDiagnostico', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const r = (status: string) => ({ diagnostico: { status, url: status === 'pronto' ? '/u' : null } })

  it('consulta a cada 3 s e para quando deixa de estar pendente', async () => {
    const buscar = vi.fn().mockResolvedValueOnce(r('pendente')).mockResolvedValueOnce(r('pronto'))
    const aoAtualizar = vi.fn(), aoEsgotar = vi.fn()
    consultarDiagnostico({ buscar, aoAtualizar, aoEsgotar })
    await vi.advanceTimersByTimeAsync(2999)
    expect(buscar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(buscar).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3000)
    expect(buscar).toHaveBeenCalledTimes(2)
    expect(aoAtualizar).toHaveBeenLastCalledWith(r('pronto'))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(buscar).toHaveBeenCalledTimes(2)
    expect(aoEsgotar).not.toHaveBeenCalled()
  })
  it('no máximo 20 consultas; depois avisa que esgotou', async () => {
    const buscar = vi.fn().mockResolvedValue(r('pendente'))
    const aoEsgotar = vi.fn()
    consultarDiagnostico({ buscar, aoAtualizar: vi.fn(), aoEsgotar })
    await vi.advanceTimersByTimeAsync(3000 * 25)
    expect(buscar).toHaveBeenCalledTimes(20)
    expect(aoEsgotar).toHaveBeenCalledTimes(1)
  })
  it('erro de rede conta como tentativa e continua', async () => {
    const buscar = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(r('erro'))
    const aoAtualizar = vi.fn()
    consultarDiagnostico({ buscar, aoAtualizar, aoEsgotar: vi.fn() })
    await vi.advanceTimersByTimeAsync(6000)
    expect(buscar).toHaveBeenCalledTimes(2)
    expect(aoAtualizar).toHaveBeenCalledWith(r('erro'))
  })
  it('parar (desmontagem) cancela a próxima consulta e ignora a resposta em voo', async () => {
    let resolver: (v: unknown) => void = () => {}
    const buscar = vi.fn().mockImplementation(() => new Promise((res) => { resolver = res }))
    const aoAtualizar = vi.fn()
    const parar = consultarDiagnostico({ buscar, aoAtualizar, aoEsgotar: vi.fn() })
    await vi.advanceTimersByTimeAsync(3000)
    parar()
    resolver(r('pendente'))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(aoAtualizar).not.toHaveBeenCalled()
  })
  it('parar antes da primeira consulta: nenhuma chamada', async () => {
    const buscar = vi.fn()
    consultarDiagnostico({ buscar, aoAtualizar: vi.fn(), aoEsgotar: vi.fn() })()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(buscar).not.toHaveBeenCalled()
  })
})
