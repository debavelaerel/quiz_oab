import { describe, expect, it } from 'vitest'
import { lerFiltros } from '../adminFiltros'
import { criarMemorySessionRepo } from './memorySessionRepo'

const utm = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
const snap = (seq: number) => ({ seq, respostas: {}, teste: [], status: 'em_andamento' as const, saidaTipo: null, ultimaPergunta: 'p' })

describe('memorySessionRepo', () => {
  it('listar busca por ref, nome e dígitos do WhatsApp', async () => {
    const r = criarMemorySessionRepo()
    const s = await r.criar({ hoje: '2026-09-30', utm })
    await r.criar({ hoje: '2026-09-30', utm })
    await r.atualizar(s.id, { nomeCompleto: 'Maria Silva', whatsapp: '(11) 99999-1234', whatsappNormalizado: '5511999991234' })
    const f = { pagina: 1, porPagina: 10 }
    expect((await r.listar({ ...f, busca: s.refCurta.toLowerCase() })).sessoes.map((x) => x.id)).toEqual([s.id])
    expect((await r.listar({ ...f, busca: 'maria' })).total).toBe(1)
    expect((await r.listar({ ...f, busca: '(11) 99999-1234' })).total).toBe(1)
    expect((await r.listar({ ...f, busca: '91234' })).total).toBe(1)
  })

  it('listar acha pelo nome (primeiro nome gravado no início do quiz)', async () => {
    const r = criarMemorySessionRepo()
    const s = await r.criar({ hoje: '2026-09-30', utm })
    await r.atualizar(s.id, { nome: 'Beatriz' })
    const out = await r.listar({ busca: 'beatr', pagina: 1, porPagina: 25 })
    expect(out.total).toBe(1)
  })

  it('listar acha o lead pela referência colada como na mensagem do WhatsApp (#XXXX)', async () => {
    const r = criarMemorySessionRepo()
    const s = await r.criar({ hoje: '2026-09-30', utm })
    await r.criar({ hoje: '2026-09-30', utm })
    const f = { pagina: 1, porPagina: 10 }
    for (const digitado of [`#${s.refCurta}`, ` #${s.refCurta.toLowerCase()} `, s.refCurta]) {
      const { busca } = lerFiltros({ busca: digitado })
      expect((await r.listar({ ...f, busca })).sessoes.map((x) => x.id)).toEqual([s.id])
    }
  })

  it('snapshot exige seq crescente; concluída recusa snapshot e segunda conclusão', async () => {
    const r = criarMemorySessionRepo()
    const s = await r.criar({ hoje: '2026-09-30', utm })
    expect(await r.salvarSnapshot(s.id, snap(1))).not.toBeNull()
    expect(await r.salvarSnapshot(s.id, snap(1))).toBeNull()
    expect(await r.salvarSnapshot(s.id, snap(0))).toBeNull()
    expect((await r.concluir(s.id, { codigo: 'A' }))?.status).toBe('concluido')
    expect(await r.concluir(s.id, { codigo: 'B' })).toBeNull()
    expect(await r.salvarSnapshot(s.id, snap(9))).toBeNull()
    expect((await r.buscarPorRef(s.refCurta))?.codigo).toBe('A')
  })

  it('mutar o objeto de entrada não altera a linha guardada', async () => {
    const r = criarMemorySessionRepo()
    const s = await r.criar({ hoje: '2026-09-30', utm })
    const patch = snap(1)
    const respostas = { situacao: 'formado' } as never
    await r.salvarSnapshot(s.id, { ...patch, respostas })
    ;(respostas as Record<string, string>).situacao = 'outro'
    expect((await r.buscarPorToken(s.sessionToken))?.respostas).toEqual({ situacao: 'formado' })
  })
})

describe('listar por status do diagnóstico', () => {
  it('devolve só os leads com aquele status', async () => {
    const r = criarMemorySessionRepo()
    const utm = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
    const a = await r.criar({ hoje: '2026-09-30', utm })
    const b = await r.criar({ hoje: '2026-09-30', utm })
    await r.atualizar(a.id, { diagnosticoStatus: 'pronto' })
    await r.atualizar(b.id, { diagnosticoStatus: 'erro' })
    const out = await r.listar({ diagnostico: 'erro', pagina: 1, porPagina: 25 })
    expect(out.sessoes.map((s) => s.id)).toEqual([b.id])
    expect(out.total).toBe(1)
  })
})
