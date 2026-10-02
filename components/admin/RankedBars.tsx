type Item = { valor: string; pct: number; contagem?: number }

/** Barras horizontais ordenadas; a maior em amarelo, as demais em roxo. */
export default function RankedBars({ titulo, dados, rotulos, vazio = 'Sem respostas neste período.' }: {
  titulo: string; dados: Item[]; rotulos?: Record<string, string>; vazio?: string
}) {
  return (
    <div>
      <p className="text-[14.5px] font-semibold">{titulo}</p>
      {dados.length === 0 ? (
        <p className="mt-2 text-[13px] text-brand-ink-soft">{vazio}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {dados.map((item, i) => (
            <div key={item.valor} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span className="text-brand-ink-soft">{rotulos?.[item.valor] ?? item.valor}</span>
              <span className="font-semibold tabular-nums">{item.contagem !== undefined ? `${item.contagem} · ` : ''}{item.pct}%</span>
              <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-brand-tint">
                <div className={`h-full rounded-full ${i === 0 ? 'bg-brand-yel' : 'bg-brand-roxo'}`} style={{ width: `${Math.max(item.pct, 2)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
