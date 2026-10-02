import { describe, expect, it } from 'vitest'
import data from '@/lib/oab/data.json'
import {
  abandonoPorPergunta, conversaoPorOrigem, distribuicao, distribuicaoAcertos, filtrarPeriodo, funil, lerPeriodo, mediaAcertos,
  mediaMinutos, questoesMaisErradas, segmentosComerciais, sessoesPorDia,
} from './adminAnalytics'

const GAB = (data.teste as { gabarito: string }[]).map((q) => q.gabarito)
const RESP_OK = {
  situacao: 'formado', tentativa: 'nunca', nivel: 'b1', metodo: 'zero', trava: 'materiais', motivo: 'advocacia',
  compromisso: 'bastante', trabalho: 'estagio', rotina: 'nada', horas: 'h3', vde: 'insta', investir: 'parcela', parcela: 'p80',
}
let n = 0
const sessao = (over: Record<string, unknown> = {}) => ({
  id: ++n, status: 'em_andamento', hoje: '2026-09-30', respostas: {}, teste: [], ultimaPergunta: null, exame: null, turma: null,
  utmSource: null, utmCampaign: null, diagnosticoStatus: null, startedAt: '2026-10-01T15:00:00Z', completedAt: null, ...over,
}) as never

describe('distribuicao', () => {
  it('conta, ignora nulos, ordena e arredonda o percentual', () => {
    expect(distribuicao(['a', 'b', 'a', null])).toEqual([{ valor: 'a', contagem: 2, pct: 67 }, { valor: 'b', contagem: 1, pct: 33 }])
  })
  it('vazio e só nulos → []', () => {
    expect(distribuicao([])).toEqual([])
    expect(distribuicao([null, undefined])).toEqual([])
  })
})

describe('sessoesPorDia', () => {
  it('usa o dia de São Paulo e preenche os dias sem sessão com zero', () => {
    expect(sessoesPorDia(['2026-10-01T02:30:00Z', '2026-10-03T12:00:00Z'])).toEqual([
      { data: '2026-09-30', contagem: 1 }, { data: '2026-10-01', contagem: 0 },
      { data: '2026-10-02', contagem: 0 }, { data: '2026-10-03', contagem: 1 },
    ])
  })
  it('vazio → []', () => expect(sessoesPorDia([])).toEqual([]))
})

describe('periodo', () => {
  const agora = new Date('2026-10-10T12:00:00Z')
  const velha = sessao({ startedAt: '2026-09-01T12:00:00Z' })
  const recente = sessao({ startedAt: '2026-10-08T12:00:00Z' })
  it('lerPeriodo: inválido vira tudo', () => {
    expect(lerPeriodo('7')).toBe('7'); expect(lerPeriodo('30')).toBe('30'); expect(lerPeriodo('x')).toBe('tudo'); expect(lerPeriodo(undefined)).toBe('tudo')
  })
  it('filtra pelos últimos N dias', () => {
    expect(filtrarPeriodo([velha, recente], '7', agora)).toEqual([recente])
    expect(filtrarPeriodo([velha, recente], '30', agora)).toEqual([recente])
    expect(filtrarPeriodo([velha, recente], 'tudo', agora)).toHaveLength(2)
  })
})

describe('funil', () => {
  it('sem sessões: 5 etapas zeradas, sem NaN', () => {
    const f = funil([])
    expect(f).toHaveLength(5)
    expect(f.every((e) => e.total === 0 && e.pct === 0)).toBe(true)
  })
  it('conta cada etapa; pct é sobre as iniciadas', () => {
    const completa = sessao({ status: 'concluido', respostas: RESP_OK, teste: GAB, diagnosticoStatus: 'pronto' })
    const soIniciou = sessao()
    const f = funil([completa, soIniciou])
    expect(f.map((e) => e.total)).toEqual([2, 1, 1, 1, 1])
    expect(f.map((e) => e.pct)).toEqual([100, 50, 50, 50, 50])
  })
})

describe('medias e testes', () => {
  const s1 = sessao({ status: 'concluido', startedAt: '2026-10-01T12:00:00Z', completedAt: '2026-10-01T12:04:00Z', teste: GAB })
  const s2 = sessao({ status: 'concluido', startedAt: '2026-10-01T12:00:00Z', completedAt: '2026-10-01T12:06:00Z', teste: ['X', 'X', 'X', 'X', 'X'] })
  const parcial = sessao({ teste: ['A'] })
  it('mediaMinutos só das concluídas; null sem nenhuma', () => {
    expect(mediaMinutos([s1, s2, parcial])).toBe(5)
    expect(mediaMinutos([parcial])).toBeNull()
  })
  it('mediaAcertos/distribuicaoAcertos usam só testes completos', () => {
    expect(mediaAcertos([s1, s2, parcial])).toBe(GAB.length / 2)
    expect(mediaAcertos([parcial])).toBeNull()
    const d = distribuicaoAcertos([s1, s2, parcial])
    expect(d).toHaveLength(GAB.length + 1)
    expect(d[0]).toBe(1); expect(d[GAB.length]).toBe(1)
  })
  it('questoesMaisErradas: pct de erro entre os testes completos', () => {
    const q = questoesMaisErradas([s1, s2])
    expect(q).toHaveLength(GAB.length)
    expect(q[0].pct).toBe(50)
    expect(questoesMaisErradas([parcial])).toEqual([])
  })
})

describe('abandono, origem e segmentos', () => {
  it('abandonoPorPergunta ignora concluídas e nomeia etapa ausente', () => {
    const r = abandonoPorPergunta([sessao({ ultimaPergunta: 'horas' }), sessao({ ultimaPergunta: 'horas' }), sessao(), sessao({ status: 'concluido', ultimaPergunta: 'resultado' })])
    expect(r).toEqual([{ valor: 'horas', contagem: 2, pct: 67 }, { valor: '(sem etapa)', contagem: 1, pct: 33 }])
  })
  it('conversaoPorOrigem: nulo vira (direto), pct = concluídas/iniciadas', () => {
    const r = conversaoPorOrigem([sessao({ utmSource: 'ig', status: 'concluido' }), sessao({ utmSource: 'ig' }), sessao()], 'utmSource')
    expect(r).toEqual([{ valor: 'ig', iniciadas: 2, concluidas: 1, pct: 50 }, { valor: '(direto)', iniciadas: 1, concluidas: 0, pct: 0 }])
  })
  it('segmentosComerciais: só concluídas com prova, agrupa e ordena', () => {
    const c = (o: Record<string, unknown>) => sessao({ status: 'concluido', exame: '48', respostas: { compromisso: 'bastante', investir: 'parcela' }, ...o })
    const r = segmentosComerciais([c({}), c({}), c({ exame: '49' }), sessao({ exame: '48' }), sessao({ status: 'concluido', exame: null })])
    expect(r).toEqual([
      { exame: '48', compromisso: 'bastante', investir: 'parcela', total: 2 },
      { exame: '49', compromisso: 'bastante', investir: 'parcela', total: 1 },
    ])
  })
})
