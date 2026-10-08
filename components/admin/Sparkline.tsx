import type { Dia } from '@/lib/adminAnalytics'

const dataCurta = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }

/** Sessões por dia: uma coluna por dia, a do dia mais recente em amarelo. Com muitos dias, só as datas de referência. */
export default function Sparkline({ dados }: { dados: Dia[] }) {
  if (dados.length === 0) return <p className="mt-2 text-[13px] text-brand-ink-soft">Nenhuma sessão neste período.</p>
  const max = Math.max(...dados.map((d) => d.contagem), 1)
  const total = dados.reduce((s, d) => s + d.contagem, 0)
  const media = total / dados.length
  const mostraValor = dados.length <= 16
  const passo = Math.ceil(dados.length / 8)
  const plural = (n: number) => (n === 1 ? 'sessão' : 'sessões')
  return (
    <div>
      <p className="text-[13px] text-brand-ink-soft">
        <b className="text-brand-ink">{total}</b> {plural(total)} em {dados.length} {dados.length === 1 ? 'dia' : 'dias'} · média de{' '}
        <b className="text-brand-ink">{media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b> por dia · pico de{' '}
        <b className="text-brand-ink">{max}</b>
      </p>
      <div className="mt-4 flex h-[160px] items-end gap-1.5 border-b border-brand-line" role="img" aria-label="Sessões iniciadas por dia">
        {dados.map((d, i) => {
          const ultimo = i === dados.length - 1
          return (
            <div key={d.data} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${dataCurta(d.data)}: ${d.contagem} ${plural(d.contagem)}`}>
              {mostraValor && <span className="mb-1 text-[12px] font-semibold tabular-nums text-brand-ink">{d.contagem}</span>}
              <div
                className={`w-full max-w-14 rounded-t-lg ${ultimo ? 'bg-brand-yel' : 'bg-brand-roxo'}`}
                style={{ height: `calc((100% - ${mostraValor ? '1.5rem' : '0px'}) * ${d.contagem / max})`, minHeight: d.contagem > 0 ? 3 : 0 }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[12px] text-brand-ink-soft">
        {dados.map((d, i) => (
          <span key={d.data} className="min-w-0 flex-1 text-center tabular-nums">
            {i % passo === 0 || i === dados.length - 1 ? dataCurta(d.data) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
