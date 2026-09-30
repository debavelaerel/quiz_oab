import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import data from './data.json'
import { make } from './logic'
import { lerCodigo } from './codigo'

const L = make(data)
const casos = JSON.parse(readFileSync('reference/qual-a-oab-dev/casos-de-teste.json', 'utf8')).casos

describe('regra de recomendação (logic.js original)', () => {
  it('tem 104 casos', () => expect(casos).toHaveLength(104))
  for (const [i, c] of casos.entries()) {
    it(`caso ${i} (${c.esperado.tipo})`, () => {
      const { A } = lerCodigo(c.codigo)
      const e = c.esperado
      const rec = L.recomendar(A, c.hoje)
      expect(rec.tipo).toBe(e.tipo)
      if ('exame' in rec) expect(rec.exame).toBe(e.exame)
      if ('turma' in rec) expect(rec.turma).toBe(e.turma)
      if (e.tipo === 'cedo') expect('quando' in rec && rec.quando).toEqual(e.quando)
      expect(L.atalho(A, c.hoje, rec)).toEqual(e.atalho ?? null)
      expect(L.exameInscricaoFechada(A, c.hoje)?.id ?? null).toBe(e.pergunta_inscricao)
      expect(['ok', 'acima', 'sem_turma'].includes(rec.tipo)).toBe(e.recebe_laudo)
    })
  }
})
