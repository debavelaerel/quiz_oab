const FORMATO = /^\d{4}-\d{2}-\d{2}$/

export function hojeSaoPaulo(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d) // AAAA-MM-DD
}

export function resolverHoje(p: { agora?: Date; override?: string | null; permitir: boolean }): string {
  if (p.permitir && p.override && FORMATO.test(p.override)) return p.override
  return hojeSaoPaulo(p.agora)
}
