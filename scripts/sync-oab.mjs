// Copia a fonte de verdade de reference/qual-a-oab-dev para onde o app e o serviço Python leem.
// Rodar: npm run sync:oab. Nunca editar as cópias à mão.
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const REF = 'reference/qual-a-oab-dev'
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

mkdirSync('lib/oab', { recursive: true })
cpSync(`${REF}/_build/logic.js`, 'lib/oab/logic.js')
cpSync(`${REF}/_build/data.json`, 'lib/oab/data.json')
const h = hash(`${REF}/_build/data.json`)
writeFileSync(
  'lib/oab/dataHash.ts',
  `// GERADO por scripts/sync-oab.mjs — não editar.\nexport const DATA_HASH = '${h}'\n`,
)

const V = 'services/diagnostico-pdf/vendor'
rmSync(V, { recursive: true, force: true })
mkdirSync(`${V}/pkg/_build`, { recursive: true })
cpSync(`${REF}/diagnosis`, `${V}/pkg/diagnosis`, {
  recursive: true,
  filter: (src) => !src.includes('__pycache__'),
})
cpSync(`${REF}/assets`, `${V}/pkg/assets`, { recursive: true })
cpSync(`${REF}/_build/data.json`, `${V}/pkg/_build/data.json`)
writeFileSync(`${V}/data.sha256`, h)
console.log('sync ok', h)
