import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DiagnosticoEmbutido from './DiagnosticoEmbutido'

describe('DiagnosticoEmbutido', () => {
  it('o HTML do lead vai num iframe com sandbox vazio (sem script, formulário nem navegação)', () => {
    const out = renderToStaticMarkup(<DiagnosticoEmbutido html="<script>alert(1)</script><p>oi</p>" />)
    expect(out).toContain('<iframe')
    expect(out).toMatch(/sandbox=""/)
    expect(out).not.toMatch(/allow-/)
    // o conteúdo só vai dentro do atributo srcdoc (escapado), nunca como filho da página
    expect(out).not.toMatch(/<script>alert\(1\)<\/script>/)
  })
  it('sem html mostra o aviso e nenhum iframe', () => {
    const out = renderToStaticMarkup(<DiagnosticoEmbutido erro="o serviço de PDF respondeu 500" />)
    expect(out).not.toContain('<iframe')
    expect(out).toContain('o serviço de PDF respondeu 500')
  })
})
