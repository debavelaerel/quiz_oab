import { describe, expect, it, vi } from 'vitest'
import nodemailer from 'nodemailer'
import { enviarDiagnostico } from './email'

describe('enviarDiagnostico', () => {
  it('sem SMTP_HOST: não envia e diz o motivo', async () => {
    delete process.env.SMTP_HOST
    expect(await enviarDiagnostico({ nome: 'Maria', email: 'm@x.com' }, 'http://l')).toEqual({ enviado: false, motivo: 'smtp_desligado' })
  })
  it('com SMTP: monta a mensagem com nome e link', async () => {
    process.env.SMTP_HOST = 'localhost'; process.env.SMTP_FROM = 'VDE <nao-responda@vde.com>'
    const sendMail = vi.fn(async () => ({}))
    const r = await enviarDiagnostico({ nome: 'Maria', email: 'm@x.com' }, 'http://l/d', { criarTransporte: () => ({ sendMail }) as never })
    expect(r.enviado).toBe(true)
    const m = (sendMail.mock.calls[0] as unknown as [{ to: string; text: string; subject: string }])[0]
    expect(m.to).toBe('m@x.com')
    expect(m.text).toContain('Maria')
    expect(m.text).toContain('http://l/d')
    expect(m.subject.toLowerCase()).toContain('diagnóstico')
  })
  it('transporte SMTP padrão tem timeouts de conexão, saudação e socket', async () => {
    process.env.SMTP_HOST = 'smtp.exemplo'
    const sendMail = vi.fn(async () => ({}))
    const spy = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never)
    try {
      expect((await enviarDiagnostico({ nome: 'Maria', email: 'm@x.com' }, 'http://l')).enviado).toBe(true)
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        host: 'smtp.exemplo', connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      }))
    } finally {
      spy.mockRestore()
    }
  })
})
