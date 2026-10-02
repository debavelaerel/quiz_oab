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
