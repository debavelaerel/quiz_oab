import type { ReactNode } from 'react'

// Componentes do painel /admin. Tudo sai dos tokens do DESIGN.md (app/globals.css): nada de cor, raio ou
// sombra solto numa página. Raios: botão 16px (rounded-2xl), cartão 14px, campo 12px (rounded-xl), pill.

export const FOCO = 'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-roxo/25'

const BASE_BTN = `inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-[14.5px] font-semibold transition disabled:pointer-events-none disabled:opacity-45 ${FOCO}`

/** Ação principal da tela (um por tela). */
export const BTN_PRIMARIO = `${BASE_BTN} bg-brand-yel text-brand-roxo-2 shadow-[0_8px_20px_rgba(245,197,24,.35)] hover:-translate-y-px hover:shadow-[0_12px_26px_rgba(245,197,24,.40)]`
/** Ação neutra, preenchida (ex.: Filtrar). */
export const BTN_NEUTRO = `${BASE_BTN} bg-brand-roxo text-white shadow-[0_8px_20px_rgba(90,0,159,.28)] hover:-translate-y-px hover:bg-brand-roxo-2 hover:shadow-[0_12px_26px_rgba(90,0,159,.32)]`
/** Ação secundária: contorno, sem sombra. */
export const BTN_CONTORNO = `${BASE_BTN} border border-brand-line-strong bg-brand-card text-brand-roxo hover:bg-brand-tint`

export const LINK = `rounded font-medium text-brand-roxo underline decoration-brand-line-strong underline-offset-2 hover:decoration-brand-roxo ${FOCO}`

/** Campo de formulário: 12px de raio, borda 1px, 16px no celular (evita o zoom do iOS). */
export const CAMPO = 'w-full rounded-xl border border-brand-line bg-brand-card px-3.5 py-3 text-base text-brand-ink placeholder:text-brand-ink-dim focus:border-brand-roxo focus:outline-none focus:ring-[3px] focus:ring-brand-roxo/[0.08] sm:text-[14.5px]'

/** Cartão: 14px, só borda (sem sombra). */
export const CARTAO = 'rounded-[14px] border border-brand-line bg-brand-card'

export function Cartao({ titulo, children, className = '' }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${CARTAO} p-4 sm:p-5 ${className}`}>
      {titulo && <h2 className="mb-3 text-[16.5px] font-bold leading-snug text-brand-roxo">{titulo}</h2>}
      {children}
    </section>
  )
}

export type Tom = 'ok' | 'aviso' | 'erro' | 'neutro'

const TOM_BADGE: Record<Tom, string> = {
  ok: 'bg-brand-green-tint text-brand-green',
  aviso: 'bg-brand-yel-tint text-brand-yel-text',
  erro: 'bg-brand-red-tint text-brand-red',
  neutro: 'bg-brand-tint text-brand-roxo',
}

/** Estado em pílula (pronto, pendente, erro...). */
export function Badge({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TOM_BADGE[tom]}`}>{children}</span>
}

const TOM_ALERTA: Record<'ok' | 'erro', string> = {
  ok: 'border-brand-green/30 bg-brand-green-tint text-brand-green',
  erro: 'border-brand-red/30 bg-brand-red-tint text-brand-red',
}

/** Aviso/erro de tela: 16px de raio, role correto. */
export function Alerta({ tom, children, className = '' }: { tom: 'ok' | 'erro'; children: ReactNode; className?: string }) {
  return (
    <p role={tom === 'erro' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-[14.5px] ${TOM_ALERTA[tom]} ${className}`}>
      {children}
    </p>
  )
}

const TOM_PILL: Record<Tom, { caixa: string; ponto: string }> = {
  ok: { caixa: 'bg-brand-green-tint text-brand-green', ponto: 'bg-brand-green' },
  aviso: { caixa: 'bg-brand-yel-tint text-brand-yel-text', ponto: 'bg-brand-yel-text' },
  erro: { caixa: 'bg-brand-red-tint text-brand-red', ponto: 'bg-brand-red' },
  neutro: { caixa: 'bg-brand-tint text-brand-roxo', ponto: 'bg-brand-roxo' },
}

/** Selo de estado com bolinha (lista e detalhe). */
export function Pill({ tom, children }: { tom: Tom; children: ReactNode }) {
  const t = TOM_PILL[tom]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${t.caixa}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.ponto}`} />
      {children}
    </span>
  )
}
