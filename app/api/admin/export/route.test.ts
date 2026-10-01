import { describe, expect, it, vi } from 'vitest'
import data from '@/lib/oab/data.json'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { reqAdmin, SEGREDO_TESTE, UTM_VAZIO } from '@/lib/server/adminTestUtil'
import { criarHandlerExport } from './route'

function linhasCsv(txt: string): string[] {
  return txt.replace(/^﻿/, '').split('\r\n').filter(Boolean)
}

describe('GET /api/admin/export', () => {
  it('CSV com cabeçalho, colunas por campo, filtros aplicados e fórmula neutralizada', async () => {
    const repo = criarMemorySessionRepo()
    const a = await repo.criar({ hoje: '2026-09-30', utm: { ...UTM_VAZIO, utmSource: 'insta' } })
    await repo.concluir(a.id, {
      nomeCompleto: '=HYPERLINK("x")', email: 'a@b.com', whatsapp: '(85) 99999-0000', tipo: 'ok', exame: '48', turma: 90,
      respostas: { situacao: 'formado', rotina: 'filhos+casa' }, teste: ['C', 'B'], diagnosticoStatus: 'pronto',
    })
    const b = await repo.criar({ hoje: '2026-09-30', utm: UTM_VAZIO })
    await repo.atualizar(b.id, { nomeCompleto: 'Outro, Nome', tipo: 'acima', exame: '49' })
    const r = await criarHandlerExport({ repo, segredo: SEGREDO_TESTE })(reqAdmin('http://x/api/admin/export?exame=48'))
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toContain('text/csv')
    expect(r.headers.get('content-disposition')).toBe('attachment; filename="leads.csv"')
    const [cab, ...linhas] = linhasCsv(await r.text())
    const colunas = cab.split(',')
    expect(colunas.slice(0, 15)).toEqual(['ref_curta', 'status', 'tipo', 'exame', 'turma', 'nome', 'email', 'whatsapp',
      'diagnostico_status', 'whatsapp_clicado_em', 'utm_source', 'utm_medium', 'utm_campaign', 'started_at', 'completed_at'])
    expect(colunas.slice(15, 21)).toEqual(['utm_content', 'utm_term', 'saida_tipo', 'ultima_pergunta', 'diagnostico_pdf_erro', 'email_erro'])
    expect(colunas.slice(21)).toEqual(data.campos)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toContain(`"'=HYPERLINK(""x"")"`)
    expect(linhas[0]).toContain(',Já me formei,')
    expect(linhas[0]).toContain('Cuido de filhos; Cuido da casa')
    expect(linhas[0]).toContain(',CB,')
  })
  it('exporta utm_content, utm_term, saída, última pergunta e erros de PDF/e-mail', async () => {
    const repo = criarMemorySessionRepo()
    const a = await repo.criar({ hoje: '2026-09-30', utm: { ...UTM_VAZIO, utmContent: 'criativo-7', utmTerm: 'oab 2027' } })
    await repo.atualizar(a.id, { saidaTipo: 'f2', ultimaPergunta: 'situacao', diagnosticoPdfErro: 'pdf 504', emailErro: 'smtp fora' })
    const r = await criarHandlerExport({ repo, segredo: SEGREDO_TESTE })(reqAdmin('http://x/api/admin/export'))
    const [cab, linha] = linhasCsv(await r.text())
    const valor = (col: string) => linha.split(',')[cab.split(',').indexOf(col)]
    expect(valor('utm_content')).toBe('criativo-7')
    expect(valor('utm_term')).toBe('oab 2027')
    expect(valor('saida_tipo')).toBe('f2')
    expect(valor('ultima_pergunta')).toBe('situacao')
    expect(valor('diagnostico_pdf_erro')).toBe('pdf 504')
    expect(valor('email_erro')).toBe('smtp fora')
  })
  it('percorre repo.listar em páginas de 500', async () => {
    const repo = criarMemorySessionRepo()
    for (let i = 0; i < 1001; i++) await repo.criar({ hoje: '2026-09-30', utm: UTM_VAZIO })
    const listar = vi.spyOn(repo, 'listar')
    const r = await criarHandlerExport({ repo, segredo: SEGREDO_TESTE })(reqAdmin('http://x/api/admin/export'))
    expect(linhasCsv(await r.text())).toHaveLength(1002)
    expect(listar.mock.calls.map((c) => [c[0].pagina, c[0].porPagina])).toEqual([[1, 500], [2, 500], [3, 500]])
  })
  it('sem sessão: 401', async () => {
    const r = await criarHandlerExport({ repo: criarMemorySessionRepo(), segredo: SEGREDO_TESTE })(reqAdmin('http://x', { logado: false }))
    expect(r.status).toBe(401)
  })
})
