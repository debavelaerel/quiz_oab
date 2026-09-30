import { describe, expect, it, vi } from 'vitest'
import { camposInvalidos, contatoDe, finalizar } from './finalizar'

const erro = (status: number, corpo: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { status, corpo })

describe('camposInvalidos (mesma regra do servidor)', () => {
  it('aceita nome e sobrenome, e-mail e celular com DDD', () => {
    expect(camposInvalidos({ nome: 'Maria Silva', email: 'maria@ex.com.br', whatsapp: '(85) 99682-6067' })).toEqual([])
  })
  it('aponta cada campo inválido', () => {
    expect(camposInvalidos({ nome: 'Maria', email: 'maria@', whatsapp: '(85) 9968-2606' })).toEqual(['nome', 'email', 'whatsapp'])
  })
  it('contatoDe apara nome e e-mail e usa os nomes do servidor', () => {
    expect(contatoDe({ nome: '  Ana Lima ', email: ' a@b.co ', whatsapp: '(11) 91234-5678' }))
      .toEqual({ nome_completo: 'Ana Lima', email: 'a@b.co', whatsapp: '(11) 91234-5678' })
  })
})

describe('finalizar', () => {
  it('sucesso direto', async () => {
    const enviar = vi.fn().mockResolvedValue('R')
    const novaSessao = vi.fn()
    expect(await finalizar({ token: 't1', enviar, novaSessao })).toEqual({ tipo: 'ok', resultado: 'R' })
    expect(enviar).toHaveBeenCalledWith('t1')
    expect(novaSessao).not.toHaveBeenCalled()
  })
  it('422 com campos do formulário → marca os campos (nomes do form)', async () => {
    const enviar = vi.fn().mockRejectedValue(erro(422, { campos: ['nome_completo', 'whatsapp'] }))
    expect(await finalizar({ token: 't1', enviar, novaSessao: vi.fn() })).toEqual({ tipo: 'campos', campos: ['nome', 'whatsapp'] })
  })
  it('422 sem campo do formulário (respostas) → falha genérica', async () => {
    const enviar = vi.fn().mockRejectedValue(erro(422, { campos: ['respostas'] }))
    expect(await finalizar({ token: 't1', enviar, novaSessao: vi.fn() })).toEqual({ tipo: 'falha' })
  })
  it('404 → sessão nova e reenvio uma vez, com o token novo', async () => {
    const enviar = vi.fn().mockRejectedValueOnce(erro(404)).mockResolvedValueOnce('R')
    const novaSessao = vi.fn().mockResolvedValue('t2')
    expect(await finalizar({ token: 't1', enviar, novaSessao })).toEqual({ tipo: 'ok', resultado: 'R' })
    expect(enviar.mock.calls).toEqual([['t1'], ['t2']])
  })
  it('404 e o reenvio falha de novo → falha (sem terceira tentativa)', async () => {
    const enviar = vi.fn().mockRejectedValue(erro(404))
    const novaSessao = vi.fn().mockResolvedValue('t2')
    expect(await finalizar({ token: 't1', enviar, novaSessao })).toEqual({ tipo: 'falha' })
    expect(enviar).toHaveBeenCalledTimes(2)
    expect(novaSessao).toHaveBeenCalledTimes(1)
  })
  it('404 e o /start novo falha → falha', async () => {
    const enviar = vi.fn().mockRejectedValue(erro(404))
    expect(await finalizar({ token: 't1', enviar, novaSessao: vi.fn().mockRejectedValue(new Error('rede')) })).toEqual({ tipo: 'falha' })
  })
  it('sem token (o /start inicial falhou) → abre sessão antes do primeiro envio', async () => {
    const enviar = vi.fn().mockResolvedValue('R')
    const novaSessao = vi.fn().mockResolvedValue('t9')
    expect(await finalizar({ token: '', enviar, novaSessao })).toEqual({ tipo: 'ok', resultado: 'R' })
    expect(enviar.mock.calls).toEqual([['t9']])
  })
  it('500 ou rede → falha, sem reabrir sessão', async () => {
    const novaSessao = vi.fn()
    expect(await finalizar({ token: 't1', enviar: vi.fn().mockRejectedValue(erro(500)), novaSessao })).toEqual({ tipo: 'falha' })
    expect(await finalizar({ token: 't1', enviar: vi.fn().mockRejectedValue(new TypeError('fetch')), novaSessao })).toEqual({ tipo: 'falha' })
    expect(novaSessao).not.toHaveBeenCalled()
  })
})
