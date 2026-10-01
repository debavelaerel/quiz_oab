// Filtros da lista de leads do admin: leitura/validação a partir da URL e
// montagem da query (paginação e "Exportar CSV" repassam os mesmos filtros).
import { EXAMES, ROTULO_STATUS, ROTULO_TIPO } from './adminLabels'
import { ALFABETO_REF } from './server/refCurta'
import type { StatusSessao } from './server/types'

export type FiltrosAdmin = {
  busca?: string
  tipo?: string
  exame?: string
  status?: StatusSessao
  pagina: number
}

// Teto pra um número enorme nunca chegar ao `range` do PostgREST.
const PAGINA_MAX = 10_000

// A mensagem do WhatsApp e a lista mostram a referência como "#K7F2", mas
// ref_curta é gravada sem o "#": tira o "#" do começo e, se o que sobra tem a
// forma de uma referência (4 letras do alfabeto da ref), põe em maiúsculas.
const FORMA_REF = new RegExp(`^[${ALFABETO_REF}]{4}$`, 'i')

function limparBusca(bruta: string | undefined): string | undefined {
  const b = bruta?.trim().replace(/^#+\s*/, '').slice(0, 200)
  if (!b) return undefined
  return FORMA_REF.test(b) ? b.toUpperCase() : b
}

type Entrada = URLSearchParams | Record<string, string | string[] | undefined>

function pegar(e: Entrada, k: string): string | undefined {
  const v = e instanceof URLSearchParams ? e.get(k) ?? undefined : e[k]
  return Array.isArray(v) ? v[0] : v
}

export function lerFiltros(e: Entrada): FiltrosAdmin {
  const busca = limparBusca(pegar(e, 'busca'))
  const tipo = pegar(e, 'tipo')
  const exame = pegar(e, 'exame')
  const status = pegar(e, 'status')
  const pagina = Number.parseInt(pegar(e, 'pagina') ?? '', 10)
  return {
    busca,
    tipo: tipo && Object.hasOwn(ROTULO_TIPO, tipo) ? tipo : undefined,
    exame: exame && EXAMES.some((x) => x.id === exame) ? exame : undefined,
    status: status && Object.hasOwn(ROTULO_STATUS, status) ? (status as StatusSessao) : undefined,
    pagina: Number.isFinite(pagina) && pagina >= 1 ? Math.min(pagina, PAGINA_MAX) : 1,
  }
}

export function queryFiltros(f: FiltrosAdmin, op: { pagina?: number; semPagina?: boolean } = {}): string {
  const q = new URLSearchParams()
  if (f.busca) q.set('busca', f.busca)
  if (f.tipo) q.set('tipo', f.tipo)
  if (f.exame) q.set('exame', f.exame)
  if (f.status) q.set('status', f.status)
  const pagina = op.pagina ?? f.pagina
  if (!op.semPagina && pagina > 1) q.set('pagina', String(pagina))
  const s = q.toString()
  return s ? `?${s}` : ''
}
