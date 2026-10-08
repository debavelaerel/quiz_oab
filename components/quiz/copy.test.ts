import { describe, expect, it } from 'vitest'
import { alternar, fimSemestre, hintDe, juntar, marcadas, opcoesDe, tituloContato, tituloDe } from './copy'

describe('tituloDe', () => {
  it('periodo semestral troca {fimSemestre} conforme o semestre de hoje', () => {
    expect(tituloDe('periodo', { regime: 'sem' }, '2026-09-30')).toBe('Qual período você está cursando até 31 de dezembro de 2026?')
    expect(tituloDe('periodo', { regime: 'sem' }, '2027-03-01')).toBe('Qual período você está cursando até 30 de junho de 2027?')
    expect(fimSemestre('2026-06-30')).toBe('30 de junho de 2026')
    expect(fimSemestre('2026-07-01')).toBe('31 de dezembro de 2026')
  })
  it('periodo anual usa tituloAno com {ano}', () => {
    expect(tituloDe('periodo', { regime: 'ano' }, '2026-09-30')).toBe('Qual ano do curso você está cursando em 2026?')
  })
  it('metodo muda de título pra quem reprovou', () => {
    expect(tituloDe('metodo', { tentativa: 'nunca' }, '2026-09-30')).toBe('Você já estudou pra OAB antes? Se sim, como estudava?')
    expect(tituloDe('metodo', { tentativa: 'reprov' }, '2026-09-30')).toBe('Quando você fez a prova, qual era o seu principal jeito de estudar?')
  })
  it('inscrito cita o exame de inscrição fechada, e o hint a data', () => {
    const A = { situacao: 'formado', tentativa: 'nunca' }
    expect(tituloDe('inscrito', A, '2026-10-10')).toBe('Você fez a inscrição na OAB 48?')
    expect(hintDe('inscrito', A, '2026-10-10')).toBe('As inscrições da OAB 48 fecharam em 05/10/2026.')
  })
})

describe('hintDe', () => {
  it('periodo depende do regime; perguntas sem hint devolvem vazio', () => {
    expect(hintDe('periodo', { regime: 'ano' }, '2026-09-30')).toBe('É o ano em que a sua matrícula está agora.')
    expect(hintDe('periodo', { regime: 'sem' }, '2026-09-30')).toMatch(/^É o período em que a sua matrícula está neste semestre/)
    expect(hintDe('rotina', {}, '2026-09-30')).toBe('Pode marcar mais de uma.')
    expect(hintDe('situacao', {}, '2026-09-30')).toBe('')
  })
})

describe('opcoesDe', () => {
  it('traz rótulo e linha de apoio do original', () => {
    expect(opcoesDe('situacao', {})).toEqual([
      { v: 'cursando', t: 'Estou cursando Direito' },
      { v: 'formado', t: 'Já me formei', s: 'Sou bacharel em Direito.' },
    ])
  })
  it('metodo usa rotulosReprov pra quem reprovou', () => {
    expect(opcoesDe('metodo', { tentativa: 'reprov' })[0]).toEqual({ v: 'zero', t: 'Fui pra prova sem me preparar' })
    expect(opcoesDe('metodo', { tentativa: 'nunca' })[0]).toEqual({ v: 'zero', t: 'Ainda não comecei a estudar' })
  })
  it('regime ano: periodo só 1–5; trava=denovo só pra reprovado', () => {
    expect(opcoesDe('periodo', { regime: 'ano' }).map((o) => o.v)).toEqual(['1', '2', '3', '4', '5'])
    expect(opcoesDe('trava', { tentativa: 'nunca' }).map((o) => o.v)).not.toContain('denovo')
    expect(opcoesDe('trava', { tentativa: 'reprov' }).map((o) => o.v)).toContain('denovo')
  })
})

describe('"O que te trava" e "Por que quer passar": menos opções, grupo unido', () => {
  const A = { situacao: 'formado', tentativa: 'nunca' }
  it('trava: 6 opções, com as 3 primeiras unidas numa só e sem o medo do índice de reprovação', () => {
    const ops = opcoesDe('trava', A)
    expect(ops.map((o) => o.v)).toEqual(['prova', 'rotina', 'tempo', 'esqueci', 'questao', 'nervoso'])
    expect(ops[0].t).toBe('Não sei como a prova funciona, por onde começar e nem quais materiais são ideais')
  })
  it('trava de quem reprovou continua com "já reprovei e tenho medo de repetir"', () => {
    expect(opcoesDe('trava', { tentativa: 'reprov' }).map((o) => o.v)).toContain('denovo')
  })
  it('motivo: 6 opções, sem "provar" e sem "emprego"', () => {
    expect(opcoesDe('motivo', A).map((o) => o.v)).toEqual(['ciclo', 'orgulho', 'advocacia', 'concursos', 'mudar', 'adiei'])
  })
  it('a opção unida grava as três respostas, na ordem do data.json', () => {
    const ops = opcoesDe('trava', A)
    expect(juntar(ops, ['rotina', 'prova'])).toBe('prova+materia+materiais+rotina')
  })
  it('ao voltar, a opção unida só aparece marcada se as três respostas estão gravadas', () => {
    const ops = opcoesDe('trava', A)
    expect(marcadas(ops, 'prova+materia+materiais+rotina')).toEqual(['prova', 'rotina'])
    expect(marcadas(ops, 'prova+rotina')).toEqual(['rotina'])
  })
})

describe('múltipla escolha', () => {
  it('a exclusiva limpa as outras e outra opção limpa a exclusiva', () => {
    expect(alternar(['filhos', 'casa'], 'nada', 'nada')).toEqual(['nada'])
    expect(alternar(['nada'], 'casa', 'nada')).toEqual(['casa'])
    expect(alternar(['filhos'], 'filhos', 'nada')).toEqual([])
    expect(alternar(['filhos'], 'casa')).toEqual(['filhos', 'casa'])
  })
  it('junta na ordem canônica das opções', () => {
    const ops = opcoesDe('rotina', {})
    expect(juntar(ops, ['outros', 'filhos'])).toBe('filhos+outros')
  })
})

describe('títulos com o nome (v3)', () => {
  const HOJE = '2026-09-30'
  it.each([
    ['situacao', 'Pra começar, Maria: como está a sua faculdade de Direito hoje?'],
    ['nivel', 'Maria, com sinceridade: como está a sua base pra prova da OAB?'],
    ['motivo', 'E agora a mais importante, Maria: por que você quer passar na OAB?'],
    ['compromisso', 'Maria, o quanto você topa mudar na sua rotina pra passar?'],
  ] as const)('%s usa o nome', (k, esperado) => {
    expect(tituloDe(k, {}, HOJE, 'Maria')).toBe(esperado)
  })
  it('sem nome, vale o título original do data.json', () => {
    expect(tituloDe('situacao', {}, HOJE)).toBe('Pra começar: como está a sua faculdade de Direito hoje?')
    expect(tituloDe('situacao', {}, HOJE, '')).toBe('Pra começar: como está a sua faculdade de Direito hoje?')
  })
  it('perguntas fora da lista não mudam', () => {
    expect(tituloDe('horas', {}, HOJE, 'Maria')).toBe(tituloDe('horas', {}, HOJE))
  })
  it('o nome é texto: "$&" e tags não são interpretados', () => {
    expect(tituloDe('nivel', {}, HOJE, 'A$&B')).toContain('A$&B, com sinceridade')
    expect(tituloDe('nivel', {}, HOJE, '<b>x</b>')).toContain('<b>x</b>, com sinceridade')
  })
  it('título da tela de contato', () => {
    expect(tituloContato('Maria')).toBe('Maria, deixe seu e-mail e WhatsApp pra receber o seu resultado')
    expect(tituloContato('')).toBe('Deixe seu e-mail e WhatsApp pra receber o seu resultado')
  })
})
