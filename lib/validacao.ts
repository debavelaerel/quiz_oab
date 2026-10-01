// Validação dos campos de identificação (capa/nome/contato) — puro, sem I/O.
// Mesma regra usada no cliente (feedback imediato, sem gastar uma
// requisição) e no servidor (fonte de verdade — nunca confia só no
// cliente), pra nunca ficarem dessincronizadas.

// Achado num teste de segurança: sem teto nenhum, um nome de centenas de KB
// passava de boa (rate-limit já existe, mas não é motivo pra aceitar
// qualquer tamanho). 200 é folgado pra qualquer nome de verdade, mesmo
// composto — não é um limite pensado pra apertar, só pra não aceitar lixo.
const TAMANHO_MAXIMO_NOME = 200

// Nome e sobrenome: pelo menos duas palavras não-vazias.
export function nomeValido(nome: string): boolean {
  const aparado = nome.trim()
  if (aparado.length > TAMANHO_MAXIMO_NOME) return false
  return aparado.split(/\s+/).filter(Boolean).length >= 2
}

/** Primeiro nome ou apelido (tela "Como podemos te chamar?"): 2 a 80 caracteres, ao menos 2 letras. */
export function nomeCurtoValido(nome: string): boolean {
  const aparado = nome.trim()
  if (aparado.length < 2 || aparado.length > 80) return false
  if (/[\p{Cc}\u202A-\u202E\u2066-\u2069]/u.test(aparado)) return false
  return (aparado.match(/\p{L}/gu) ?? []).length >= 2
}

// E-mail em formato padrão: local@dominio.tld, sem espaço, TLD só com
// letras (2+). Não tenta cobrir todo o RFC 5322 — é validação de formulário,
// não parser de e-mail.
const REGEX_EMAIL = /^[\w.+-]+@(?:[\w-]+\.)+[a-zA-Z]{2,}$/
// RFC 5321 §4.5.3.1.3: 254 é o teto prático de um endereço de e-mail
// inteiro (não só um número redondo escolhido à toa).
const TAMANHO_MAXIMO_EMAIL = 254

export function emailValido(email: string): boolean {
  const aparado = email.trim()
  if (aparado.length > TAMANHO_MAXIMO_EMAIL) return false
  return REGEX_EMAIL.test(aparado)
}

// DDDs que existem no Brasil (Anatel). Fora deles o número não é de verdade
// (ex.: "00", "20", "23" — erro de digitação ou lixo).
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

// WhatsApp no padrão brasileiro: DDD existente (2 dígitos) + celular com o 9º
// dígito (9 dígitos) = exatamente 11 dígitos. Aceita qualquer formatação
// (parênteses, espaço, traço, +55 na frente é removido antes de contar).
export function whatsappValido(whatsapp: string): boolean {
  let digitos = whatsapp.replace(/\D/g, '')
  if (digitos.length === 13 && digitos.startsWith('55')) digitos = digitos.slice(2)
  return digitos.length === 11 && DDDS.has(Number(digitos.slice(0, 2)))
}
