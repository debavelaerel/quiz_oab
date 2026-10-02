import { describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from './memorySessionRepo'
import { listarTudo } from './listarTudo'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }

describe('listarTudo', () => {
  it('pagina de 500 em 500 e devolve tudo, respeitando o limite', async () => {
    const repo = criarMemorySessionRepo()
    for (let i = 0; i < 1200; i++) await repo.criar({ hoje: '2026-09-30', utm: UTM })
    const tudo = await listarTudo(repo, {})
    expect(tudo.sessoes).toHaveLength(1200)
    expect(tudo.total).toBe(1200)
    const corte = await listarTudo(repo, {}, 300)
    expect(corte.sessoes).toHaveLength(300)
    expect(corte.total).toBe(1200)
  })
  it('repositório vazio → listas vazias', async () => {
    expect(await listarTudo(criarMemorySessionRepo(), {})).toEqual({ sessoes: [], total: 0 })
  })
})

describe('listarTudo: sessões novas durante a leitura', () => {
  it('não conta duas vezes uma linha que "desceu" de página', async () => {
    const linha = (id: number) => ({ id }) as never
    const paginas = [
      Array.from({ length: 500 }, (_, i) => linha(i + 1)),
      [linha(500), ...Array.from({ length: 99 }, (_, i) => linha(501 + i))], // a 500 repetiu na página 2
    ]
    const repo = { listar: async ({ pagina }: { pagina: number }) => ({ sessoes: paginas[pagina - 1] ?? [], total: 599 }) } as never
    const r = await listarTudo(repo, {})
    expect(r.sessoes).toHaveLength(599)
    expect(new Set(r.sessoes.map((s) => s.id)).size).toBe(599)
  })
})
