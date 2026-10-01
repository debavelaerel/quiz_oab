// `?proximo=` do login vem da URL: entrada não-confiável (open redirect).
// Não basta recusar "//" e "\": o parser WHATWG remove TAB/LF/CR, então
// "/\t/evil.com" vira "//evil.com". Por isso: recusa caracteres de controle,
// resolve contra uma origem fictícia e só aceita se continuar nela e dentro
// de /admin (fora o próprio /admin/login, pra não entrar em laço).
const PADRAO = '/admin/leads'
const ORIGEM = 'http://admin.invalid'

export function destinoSeguro(proximo: string | null | undefined): string {
  if (!proximo) return PADRAO
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f\\]/.test(proximo) || !proximo.startsWith('/')) return PADRAO
  let url: URL
  try {
    url = new URL(proximo, ORIGEM)
  } catch {
    return PADRAO
  }
  if (url.origin !== ORIGEM) return PADRAO
  const { pathname } = url
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return PADRAO
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return PADRAO
  return pathname + url.search
}
