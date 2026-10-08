import data from './data.json'
import { respostaAssumida, type Campo } from './fluxo'
import type { Respostas } from './logic'

const CAMPOS = data.campos as string[]
const PREFIXO = data.prefixo as string

/** hoje: 'AAAA-MM-DD'. teste: letras A–D ou X, na ordem das questões. */
export function montarCodigo(A: Respostas, teste: string[], hoje: string): string {
  const partes = CAMPOS.map((c) => (c === 'teste' ? (teste.length ? teste.join('') : '-') : (A[c] ?? respostaAssumida(c as Campo, A) ?? '-')))
  return `${PREFIXO}.${partes.join('.')}.${hoje.replaceAll('-', '')}`
}

export function lerCodigo(codigo: string): { A: Respostas; teste: string[]; hoje: string } {
  const partes = codigo.split('.')
  if (partes[0] !== PREFIXO) throw new Error(`prefixo inválido: ${partes[0]}`)
  const corpo = partes.slice(1)
  if (corpo.length !== CAMPOS.length + 1) throw new Error(`esperava ${CAMPOS.length + 1} partes, veio ${corpo.length}`)
  const d = corpo[corpo.length - 1]
  if (!/^\d{8}$/.test(d)) throw new Error(`data inválida: ${d}`)
  const A: Respostas = {}
  let teste: string[] = []
  CAMPOS.forEach((c, i) => {
    const v = corpo[i]
    if (v === '-') return
    if (c === 'teste') teste = v.split('')
    else A[c] = v
  })
  return { A, teste, hoje: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` }
}
