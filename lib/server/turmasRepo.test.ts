import { describe, expect, it, vi } from 'vitest'
import { TURMAS_PADRAO, type EdicaoTurma } from '@/lib/oab/turmas'
import { criarServicoTurmas, type TurmasRepo } from './turmasRepo'

const edicoes = (): EdicaoTurma[] => TURMAS_PADRAO.map((t) => ({ ...t }))
const repoDe = (valor: Awaited<ReturnType<TurmasRepo['ler']>> | Error): TurmasRepo => ({
  ler: vi.fn(async () => { if (valor instanceof Error) throw valor; return valor }),
  salvar: vi.fn(async () => {}),
  restaurar: vi.fn(async () => {}),
})

describe('serviço de turmas', () => {
  it('sem nada gravado, usa o data.json', async () => {
    const s = criarServicoTurmas(repoDe(null))
    expect((await s.atuais()).turmas).toEqual(TURMAS_PADRAO)
  })
  it('usa as datas gravadas e guarda em cache por 1 minuto', async () => {
    const e = edicoes(); e[6] = { ...e[6], vendasFim: '2027-01-24' }
    const repo = repoDe({ edicoes: e, atualizadoEm: '2026-10-08T12:00:00Z' })
    let t = 0
    const s = criarServicoTurmas(repo, () => t)
    expect((await s.atuais()).turmas[6].vendasFim).toBe('2027-01-24')
    await s.atuais(); expect(repo.ler).toHaveBeenCalledTimes(1)
    t = 61_000; await s.atuais(); expect(repo.ler).toHaveBeenCalledTimes(2)
  })
  it('fresco ignora o cache', async () => {
    const repo = repoDe(null); const s = criarServicoTurmas(repo)
    await s.atuais(); await s.atuais({ fresco: true })
    expect(repo.ler).toHaveBeenCalledTimes(2)
  })
  it('se o banco falha ou o conteúdo é inválido, cai no data.json', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await criarServicoTurmas(repoDe(new Error('fora'))).atuais()).turmas).toEqual(TURMAS_PADRAO)
    const ruim = edicoes(); ruim[0] = { ...ruim[0], vendasFim: '1999-01-01' }
    expect((await criarServicoTurmas(repoDe({ edicoes: ruim, atualizadoEm: 'x' })).atuais()).turmas).toEqual(TURMAS_PADRAO)
  })
  it('salvar e restaurar limpam o cache', async () => {
    const repo = repoDe(null); const s = criarServicoTurmas(repo)
    await s.atuais(); await s.salvar(edicoes()); await s.atuais(); await s.restaurar(); await s.atuais()
    expect(repo.ler).toHaveBeenCalledTimes(3)
  })
})
