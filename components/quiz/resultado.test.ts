import { describe, expect, it } from 'vitest'
import { acertos, brc, diasAteProva, itensDiagnostico, linkWhatsApp, outrosExames, previaDe, quandoCedo, TESTE } from './resultado'

const GAB = TESTE.map((q) => q.gabarito)

describe('acertos', () => {
  it('conta só as letras iguais ao gabarito; X e vazio não contam', () => {
    expect(acertos(GAB)).toBe(GAB.length)
    expect(acertos([])).toBe(0)
    expect(acertos(['X', GAB[1], 'X', 'X', 'X'])).toBe(1)
  })
})

describe('linkWhatsApp', () => {
  it('wa.me do número + mensagem codificada com #ref e sem QO1', () => {
    const h = linkWhatsApp('5511999990000', { nome: 'Maria', rec: { tipo: 'ok', exame: '48', turma: 90 }, ref: 'K7F2' })
    expect(h.startsWith('https://wa.me/5511999990000?text=')).toBe(true)
    const msg = decodeURIComponent(h.split('?text=')[1])
    expect(msg).toContain('OAB 48')
    expect(msg).toContain('90 dias')
    expect(msg).toContain('#K7F2')
    expect(msg).not.toContain('QO1')
    expect(h).not.toMatch(/[ #"]/) // tudo codificado
  })
})

describe('quandoCedo', () => {
  it('semestral: 1º período em set/2026 → a partir de 2030, mínimo 9º período', () => {
    expect(quandoCedo({ situacao: 'cursando', regime: 'sem', periodo: '1' }, '2026-09-30')).toEqual({ ano: 2030, minimo: '9º período' })
  })
  it('anual: 1º ano em 2026 → 2030, mínimo 5º ano', () => {
    expect(quandoCedo({ situacao: 'cursando', regime: 'ano', periodo: '1' }, '2026-09-30')).toEqual({ ano: 2030, minimo: '5º ano' })
  })
})

describe('resultado: cabeçalho e lista', () => {
  it('brc e dias até a 1ª fase', () => {
    expect(brc('2027-02-28')).toBe('28/02')
    expect(diasAteProva('48', '2027-01-01')).toBe(9)
  })
  it('formado que nunca fez, recomendado pra 49 em set/2026: cita a 48 e a 50 como outras', () => {
    const A = { situacao: 'formado', tentativa: 'nunca' } as const
    expect(outrosExames(A, '49', '2026-09-30')).toEqual(['OAB 48', 'OAB 50'])
    const itens = itensDiagnostico(A, '49', '2026-09-30')
    expect(itens[0]).toBe('Por que OAB 48 e OAB 50 não são a melhor escolha pra você agora')
    expect(itens.at(-1)).toBe('O que muda no seu jeito de estudar a partir de agora')
    expect(itens).not.toContain('A projeção dos seus períodos, semestre a semestre, até a prova')
  })
  it('estudante reprovado: projeção dos períodos e o item de quem reprovou; exame passado não entra', () => {
    const A = { situacao: 'cursando', regime: 'sem', periodo: '9', tentativa: 'reprov' } as const
    const itens = itensDiagnostico(A, '50', '2027-03-01')
    expect(itens[0]).toBe('A projeção dos seus períodos, semestre a semestre, até a prova')
    expect(itens[1]).toBe('Por que OAB 49 não é a melhor escolha pra você agora')
    expect(itens.at(-1)).toBe('O que precisa mudar no seu jeito de estudar pra não repetir a última prova')
  })
})

describe('previaDe', () => {
  it('turma indicada marcada, até 3 turmas, sinais dos erros e correção das 5', () => {
    const p = previaDe({ exame: '48', turma: 90 }, ['X', 'X', 'X', 'X', 'X'], '2026-10-01')
    expect(p.turma).toEqual({ dias: 90, inicio: '2026-10-12' })
    expect(p.turmas.length).toBeLessThanOrEqual(3)
    expect(p.turmas.filter((t) => t.on).map((t) => t.dias)).toEqual([90])
    expect(p.sinais).toEqual([TESTE[0].sinal.texto, TESTE[1].sinal.texto])
    expect(p.correcao).toHaveLength(5)
    expect(p.correcao[0].comentario.endsWith('…')).toBe(true)
  })
  it('acertou tudo: mostra o sinal da 1ª questão; sem turma (sem_turma) → sem kpi', () => {
    const p = previaDe({ exame: '48' }, GAB, '2026-10-01')
    expect(p.sinais).toEqual([TESTE[0].sinal.texto])
    expect(p.turma).toBeNull()
    expect(p.turmas.every((t) => !t.on)).toBe(true)
  })
})
