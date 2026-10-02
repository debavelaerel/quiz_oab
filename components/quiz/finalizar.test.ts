import { describe, expect, it, vi } from 'vitest'
import { camposInvalidos, contatoDe, finalizar, MSG_WHATSAPP } from './finalizar'

const erro = (status: number, corpo: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { status, corpo })

describe('formulário de contato (e-mail + WhatsApp)', () => {
  it('contatoDe leva só e-mail e WhatsApp, aparados', () => {
    expect(contatoDe({ email: ' a@b.co ', whatsapp: '(11) 91234-5678' })).toEqual({ email: 'a@b.co', whatsapp: '(11) 91234-5678' })
  })
  it('camposInvalidos usa a regra do servidor (DDD real, 9º dígito, e-mail)', () => {
    expect(camposInvalidos({ email: 'a@b.co', whatsapp: '(11) 91234-5678' })).toEqual([])
    expect(camposInvalidos({ email: 'x', whatsapp: '(00) 91234-5678' })).toEqual(['whatsapp', 'email'])
  })
  it('a mensagem de WhatsApp inválido traz o formato esperado', () => {
    expect(MSG_WHATSAPP).toBe('WhatsApp inválido. Use o formato (11) 91234-5678.')
  })
})

describe('finalizar', () => {
  const base = () => ({ token: 't1', enviar: vi.fn().mockResolvedValue({ ok: 1 }), novaSessao: vi.fn().mockResolvedValue('t2') })

  it('sucesso na primeira', async () => {
    const d = base()
    expect(await finalizar(d)).toEqual({ tipo: 'ok', resultado: { ok: 1 } })
    expect(d.novaSessao).not.toHaveBeenCalled()
  })
  it('422 com campos do formulário → esses campos', async () => {
    const d = { ...base(), enviar: vi.fn().mockRejectedValue(erro(422, { campos: ['whatsapp'] })) }
    expect(await finalizar(d)).toEqual({ tipo: 'campos', campos: ['whatsapp'] })
  })
  it('422 com campo nome → volta ao passo do nome', async () => {
    const d = { ...base(), enviar: vi.fn().mockRejectedValue(erro(422, { campos: ['nome'] })) }
    expect(await finalizar(d)).toEqual({ tipo: 'nome' })
  })
  it('422 sem campos do formulário (respostas etc.) → falha', async () => {
    const d = { ...base(), enviar: vi.fn().mockRejectedValue(erro(422, { campos: ['respostas'] })) }
    expect(await finalizar(d)).toEqual({ tipo: 'falha' })
  })
  it('404 → uma sessão nova e um único reenvio', async () => {
    const enviar = vi.fn().mockRejectedValueOnce(erro(404)).mockResolvedValueOnce({ ok: 2 })
    const d = { ...base(), enviar }
    expect(await finalizar(d)).toEqual({ tipo: 'ok', resultado: { ok: 2 } })
    expect(enviar).toHaveBeenNthCalledWith(2, 't2')
    expect(enviar.mock.calls).toEqual([['t1'], ['t2']])
  })
  it('404 duas vezes → falha, sem terceira tentativa', async () => {
    const enviar = vi.fn().mockRejectedValue(erro(404))
    const d = { ...base(), enviar }
    expect(await finalizar(d)).toEqual({ tipo: 'falha' })
    expect(enviar).toHaveBeenCalledTimes(2)
    expect(d.novaSessao).toHaveBeenCalledTimes(1)
  })
  it('sem token (start falhou) → abre sessão e envia uma vez', async () => {
    const d = { ...base(), token: '' }
    expect(await finalizar(d)).toEqual({ tipo: 'ok', resultado: { ok: 1 } })
    expect(d.enviar).toHaveBeenCalledWith('t2')
  })
  it('novaSessao falhando → falha', async () => {
    const d = { ...base(), token: '', novaSessao: vi.fn().mockRejectedValue(new Error('rede')) }
    expect(await finalizar(d)).toEqual({ tipo: 'falha' })
  })
  it('500 e erro de rede → falha (tentar de novo)', async () => {
    const a = { ...base(), enviar: vi.fn().mockRejectedValue(erro(500)) }
    expect(await finalizar(a)).toEqual({ tipo: 'falha' })
    expect(a.novaSessao).not.toHaveBeenCalled()
    const b = { ...base(), enviar: vi.fn().mockRejectedValue(new Error('rede')) }
    expect(await finalizar(b)).toEqual({ tipo: 'falha' })
    expect(b.novaSessao).not.toHaveBeenCalled()
  })
})
