import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DATA_HASH } from './dataHash'

const h = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex')

describe('data.json: uma única fonte', () => {
  it('todas as cópias têm o mesmo hash', () => {
    const ref = h('reference/qual-a-oab-dev/_build/data.json')
    expect(h('lib/oab/data.json')).toBe(ref)
    expect(h('services/diagnostico-pdf/vendor/pkg/_build/data.json')).toBe(ref)
    expect(readFileSync('services/diagnostico-pdf/vendor/data.sha256', 'utf8')).toBe(ref)
    expect(DATA_HASH).toBe(ref)
  })
  it('logic.js copiado é idêntico ao da referência', () => {
    expect(h('lib/oab/logic.js')).toBe(h('reference/qual-a-oab-dev/_build/logic.js'))
  })
})
