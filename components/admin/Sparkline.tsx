import type { Dia } from '@/lib/adminAnalytics'

const LARGURA = 320
const ALTURA = 64
const MARGEM = 6
const dataCurta = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }

/** Sessões por dia: linha roxa com o último ponto em amarelo. */
export default function Sparkline({ dados }: { dados: Dia[] }) {
  if (dados.length < 2) {
    return <p className="mt-2 text-[13px] text-brand-ink-soft">Dados insuficientes para mostrar tendência (mínimo de 2 dias com sessão).</p>
  }
  const max = Math.max(...dados.map((d) => d.contagem), 1)
  const pontos = dados.map((d, i) => ({
    x: (i / (dados.length - 1)) * (LARGURA - MARGEM * 2) + MARGEM,
    y: ALTURA - MARGEM - (d.contagem / max) * (ALTURA - MARGEM * 2),
  }))
  const ultimo = pontos[pontos.length - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} width="100%" height={ALTURA} className="mt-3" preserveAspectRatio="none" role="img" aria-label="Sessões iniciadas por dia">
        <polyline points={pontos.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--color-brand-roxo)" strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={ultimo.x} cy={ultimo.y} r={4.5} fill="var(--color-brand-yel)" stroke="var(--color-brand-roxo-2)" strokeWidth={1.5} />
      </svg>
      <div className="mt-1 flex justify-between text-[12px] text-brand-ink-soft">
        <span>{dataCurta(dados[0].data)}</span>
        <span>pico: {max} {max === 1 ? 'sessão' : 'sessões'}/dia</span>
        <span>{dataCurta(dados[dados.length - 1].data)}</span>
      </div>
    </div>
  )
}
