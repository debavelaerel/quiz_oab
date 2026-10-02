/**
 * Endereço público do site para links colados fora do admin (WhatsApp, CRM). `APP_URL` vem primeiro (é o mesmo
 * usado no e-mail): o Host da requisição pode ser um endereço interno. Sem `APP_URL`, usa o Host; http só para
 * localhost / 127.x / ::1 exatos (um host como "localhost.evil.com" é tratado como qualquer outro: https).
 */
export function urlBase(appUrl: string | undefined, host: string | null): string {
  const fixo = appUrl?.trim().replace(/\/+$/, '')
  if (fixo) return fixo
  if (!host) return ''
  const nome = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
  const local = nome === 'localhost' || nome === '::1' || /^127(\.\d{1,3}){3}$/.test(nome)
  return `${local ? 'http' : 'https'}://${host}`
}
