import { paraFatias } from '@/lib/adminPie'

// Cores do DESIGN.md (tokens), lidas como variáveis CSS.
const CORES = ['--color-brand-roxo', '--color-brand-yel', '--color-brand-line-strong', '--color-brand-roxo-2', '--color-brand-line', '--color-brand-yel-text']
const cor = (i: number) => `var(${CORES[i % CORES.length]})`

export default function PieChart({ titulo, dados, rotulos }: {
  titulo: string; dados: { valor: string; contagem: number; pct: number }[]; rotulos?: Record<string, string>
}) {
  const raio = 64
  const fatias = paraFatias(dados, raio)
  return (
    <div>
      <p className="text-[14.5px] font-semibold">{titulo}</p>
      {dados.length === 0 ? (
        <p className="mt-2 text-[13px] text-brand-ink-soft">Sem dados neste período.</p>
      ) : (
        <div className="mt-3 flex items-center gap-5">
          <svg width={raio * 2} height={raio * 2} viewBox={`0 0 ${raio * 2} ${raio * 2}`} className="flex-none" role="img" aria-label={titulo}>
            {fatias.map((f, i) => <path key={f.valor} d={f.path} fill={cor(i)} stroke="var(--color-brand-card)" strokeWidth={1.5} />)}
          </svg>
          <ul className="flex flex-col gap-1.5">
            {dados.map((d, i) => (
              <li key={d.valor} className="flex items-center gap-2 text-[12.5px]">
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: cor(i) }} />
                <span className="text-brand-ink-soft">{rotulos?.[d.valor] ?? d.valor}</span>
                <span className="font-semibold">{d.contagem} · {d.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
