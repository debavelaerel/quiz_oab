// CSV RFC 4180 (vírgula, CRLF, aspas duplicadas) com proteção contra injeção
// de fórmula: célula de texto que começa com = + - @ TAB ou CR ganha um
// apóstrofo na frente (e vai entre aspas), pra planilha tratar como texto.
export function celulaCsv(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  let s = String(v)
  const perigosa = /^[=+\-@\t\r]/.test(s)
  if (perigosa) s = `'${s}`
  return /[",\r\n]/.test(s) || perigosa ? `"${s.replace(/"/g, '""')}"` : s
}

export const montarCsv = (cabecalho: string[], linhas: unknown[][]) =>
  [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(',')).join('\r\n') + '\r\n'
