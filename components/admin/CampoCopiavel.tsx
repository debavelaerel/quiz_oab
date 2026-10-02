'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { FOCO } from './ui'

/** Campo de leitura com botão "Copiar" (links para colar no CRM). */
export default function CampoCopiavel({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try { await navigator.clipboard.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch { /* sem permissão: o campo continua selecionável */ }
  }
  return (
    <div>
      <div className="text-[12.5px] text-brand-ink-soft">{label}</div>
      <div className="mt-1 flex gap-2">
        <input readOnly value={valor} onFocus={(e) => e.currentTarget.select()} aria-label={label}
          className="min-w-0 flex-1 rounded-xl border border-brand-line bg-brand-tint px-3 py-2 font-mono text-[12.5px] text-brand-ink focus:border-brand-roxo focus:outline-none" />
        <button type="button" onClick={() => void copiar()} aria-label={`Copiar ${label}`}
          className={`inline-flex items-center gap-1.5 rounded-2xl border border-brand-line-strong bg-brand-card px-3 text-[13px] font-semibold text-brand-roxo hover:bg-brand-tint ${FOCO}`}>
          {copiado ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.25} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
