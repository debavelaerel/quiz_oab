import { describe, expect, it, vi } from 'vitest'
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
})
