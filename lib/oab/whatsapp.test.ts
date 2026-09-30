import { describe, expect, it } from 'vitest'
import { montarMensagemWhatsApp } from './whatsapp'

describe('mensagem do WhatsApp', () => {
  it('ok: prova, turma e referência; sem código QO1', () => {
    const m = montarMensagemWhatsApp({ nome: 'Maria', rec: { tipo: 'ok', exame: '48', turma: 90 }, ref: 'K7F2' })
    expect(m).toContain('Maria')
    expect(m).toContain('OAB 48')
    expect(m).toContain('90 dias')
    expect(m).toContain('#K7F2')
    expect(m).not.toContain('QO1')
  })
  it('sem_turma cita a prova mas não a turma', () => {
    const m = montarMensagemWhatsApp({ nome: 'Ana', rec: { tipo: 'sem_turma', exame: '49' }, ref: 'AB23' })
    expect(m).toContain('OAB 49')
    expect(m).not.toContain('dias')
  })
  it('sem_prova tem texto próprio, sem "undefined"', () => {
    const m = montarMensagemWhatsApp({ nome: 'Lia', rec: { tipo: 'sem_prova' }, ref: 'ZZ99' })
    expect(m).not.toContain('undefined')
    expect(m).toContain('#ZZ99')
  })
})
