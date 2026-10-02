import { describe, expect, it } from 'vitest'
import { linkWhatsappLead } from './adminWhatsapp'

const base = { nome: 'Maria', telefone: '5585999990000', exame: '48', turma: 90, linkPdf: 'https://app.exemplo.com/api/diagnostico/abc' }
const texto = (url: string | null) => decodeURIComponent(url!.split('?text=')[1])

describe('linkWhatsappLead', () => {
  it('abre a conversa com o telefone do lead e cita nome, prova, turma e o link do PDF', () => {
    const url = linkWhatsappLead(base)!
    expect(url.startsWith('https://wa.me/5585999990000?text=')).toBe(true)
    const t = texto(url)
    expect(t).toContain('Maria'); expect(t).toContain('OAB 48'); expect(t).toContain('90 dias'); expect(t).toContain(base.linkPdf)
  })
  it('sem telefone (ou curto demais) → null', () => {
    expect(linkWhatsappLead({ ...base, telefone: null })).toBeNull()
    expect(linkWhatsappLead({ ...base, telefone: '123' })).toBeNull()
  })
  it('telefone formatado e sem DDI ganha o 55', () => {
    expect(linkWhatsappLead({ ...base, telefone: '(85) 99999-0000' })!.startsWith('https://wa.me/5585999990000?')).toBe(true)
  })
  it('nome com & # e emoji fica codificado; sem PDF ou sem prova não inventa texto', () => {
    const url = linkWhatsappLead({ ...base, nome: 'Ana & #1 😀', linkPdf: null, exame: null, turma: null })!
    expect(url).not.toMatch(/[ #&](?!.*text=)/)
    expect(url.split('?text=')[1]).not.toMatch(/[ #]/)
    const t = texto(url)
    expect(t).toContain('Ana & #1 😀'); expect(t).not.toContain('http'); expect(t).not.toContain('OAB')
  })
})
