import type { Etapa } from '@/lib/adminAnalytics'

/** Funil do início do quiz ao diagnóstico gerado; a última etapa (o objetivo) em amarelo. */
export default function Funnel({ etapas }: { etapas: Etapa[] }) {
  if (etapas.length === 0 || etapas[0].total === 0) {
    return <p className="mt-2 text-[13px] text-brand-ink-soft">Sem sessões neste período para montar o funil.</p>
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      {etapas.map((e, i) => (
        <div key={e.etapa} className="grid grid-cols-[minmax(120px,170px)_1fr_44px] items-center gap-2.5 text-[12.5px]">
          <span className="text-right text-brand-ink-soft">{e.etapa}</span>
          <div className="h-[26px] overflow-hidden rounded-xl bg-brand-tint">
            <div
              className={`flex h-full items-center rounded-xl pl-2.5 text-[12px] font-semibold ${i === etapas.length - 1 ? 'bg-brand-yel text-brand-roxo-2' : 'bg-brand-roxo text-white'}`}
              style={{ width: `${Math.max(e.pct, 8)}%` }}
            >
              {e.total}
            </div>
          </div>
          <span className="text-right font-semibold tabular-nums">{e.pct}%</span>
        </div>
      ))}
    </div>
  )
}
