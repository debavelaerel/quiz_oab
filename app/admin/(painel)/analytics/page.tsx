import Link from 'next/link'
import {
  abandonoPorPergunta, conversaoPorOrigem, distribuicao, distribuicaoAcertos, filtrarPeriodo, funil, lerPeriodo, mediaAcertos,
  mediaMinutos, questoesMaisErradas, segmentosComerciais, sessoesPorDia, TOTAL_TESTE, type Origem, type Periodo,
} from '@/lib/adminAnalytics'
import { ROTULO_TIPO, rotuloEtapa, rotuloExame, rotuloResposta, rotuloTurma, tituloPergunta } from '@/lib/adminLabels'
import Funnel from '@/components/admin/Funnel'
import PieChart from '@/components/admin/PieChart'
import RankedBars from '@/components/admin/RankedBars'
import Sparkline from '@/components/admin/Sparkline'
import { Cartao, FOCO } from '@/components/admin/ui'
import { obterRepo } from '@/lib/server/container'
import { listarTudo } from '@/lib/server/listarTudo'

export const runtime = 'nodejs'
// Os dados mudam a cada resposta: nunca pré-renderizar esta página.
export const dynamic = 'force-dynamic'

const LIMITE = 5000
const PERIODOS: { v: Periodo; rotulo: string }[] = [{ v: 'tudo', rotulo: 'Tudo' }, { v: '30', rotulo: '30 dias' }, { v: '7', rotulo: '7 dias' }]
// Perguntas do perfil (as de múltipla escolha guardam "a+b").
const PERFIL = ['situacao', 'regime', 'periodo', 'tentativa', 'nivel', 'horas', 'trabalho', 'vde', 'rotina', 'trava', 'motivo', 'compromisso', 'investir', 'parcela']
const MULTI = new Set(['rotina', 'trava', 'motivo'])
const ROTULOS_SAIDA = { cedo: 'Cedo demais para a OAB', f2: 'Já passou na 1ª fase' }

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

function TabelaOrigem({ titulo, dados }: { titulo: string; dados: Origem[] }) {
  return (
    <div>
      <p className="text-[14.5px] font-semibold">{titulo}</p>
      {dados.length === 0 ? <p className="mt-2 text-[13px] text-brand-ink-soft">Sem dados neste período.</p> : (
        <table className="mt-3 w-full text-left text-[13px]">
          <thead className="text-[12px] uppercase tracking-wide text-brand-ink-soft"><tr><th className="pb-1.5">Origem</th><th className="pb-1.5 text-right">Iniciadas</th><th className="pb-1.5 text-right">Concluídas</th><th className="pb-1.5 text-right">Conversão</th></tr></thead>
          <tbody>
            {dados.slice(0, 8).map((o) => (
              <tr key={o.valor} className="border-t border-brand-line"><td className="py-1.5 pr-2">{o.valor}</td><td className="py-1.5 text-right tabular-nums">{o.iniciadas}</td><td className="py-1.5 text-right tabular-nums">{o.concluidas}</td><td className="py-1.5 text-right font-semibold tabular-nums">{o.pct}%</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const periodo = lerPeriodo(typeof sp.periodo === 'string' ? sp.periodo : undefined)
  const { sessoes: todas, total: totalGeral } = await listarTudo(obterRepo(), {}, LIMITE)
  const sessoes = filtrarPeriodo(todas, periodo)
  const concluidas = sessoes.filter((s) => s.status === 'concluido')
  const comDiag = concluidas.filter((s) => s.diagnosticoStatus && s.diagnosticoStatus !== 'nao_se_aplica')
  const media = mediaAcertos(sessoes)
  const tempo = mediaMinutos(sessoes)

  const kpis = [
    { num: sessoes.length, lbl: 'sessões iniciadas' },
    { num: `${pct(concluidas.length, sessoes.length)}%`, lbl: 'taxa de conclusão' },
    { num: concluidas.length, lbl: 'concluídas' },
    { num: media !== null ? `${media.toFixed(1)} / ${TOTAL_TESTE}` : '—', lbl: 'média de acertos' },
    { num: `${pct(comDiag.filter((s) => s.diagnosticoStatus === 'pronto').length, comDiag.length)}%`, lbl: 'diagnósticos prontos' },
    { num: tempo !== null ? `${Math.round(tempo)} min` : '—', lbl: 'tempo médio até concluir' },
  ]
  const acertos = distribuicaoAcertos(sessoes)
  const totalTestes = acertos.reduce((a, b) => a + b, 0)
  const rotulosDe = (campo: string, valores: string[]) => Object.fromEntries(valores.map((v) => [v, rotuloResposta(campo, v)]))
  const abandono = abandonoPorPergunta(sessoes)
  const porTurma = distribuicao(concluidas.map((s) => (s.turma ? String(s.turma) : null)))
  const porProva = distribuicao(concluidas.map((s) => s.exame))
  const porTipo = distribuicao(concluidas.map((s) => s.tipo))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.01em]">Analytics</h1>
          <p className="mt-0.5 text-[13px] text-brand-ink-soft">
            {sessoes.length} {sessoes.length === 1 ? 'sessão' : 'sessões'} no período
            {todas.length < totalGeral ? ` · lendo as ${todas.length} mais recentes de ${totalGeral}` : ''}
          </p>
        </div>
        <nav className="flex gap-2" aria-label="Período">
          {PERIODOS.map(({ v, rotulo }) => (
            <Link key={v} href={v === 'tudo' ? '/admin/analytics' : `/admin/analytics?periodo=${v}`} aria-current={periodo === v ? 'page' : undefined}
              className={`rounded-2xl px-4 py-2 text-[14.5px] font-medium transition-colors ${FOCO} ${periodo === v ? 'bg-brand-roxo text-white' : 'border border-brand-line-strong bg-brand-card text-brand-roxo hover:bg-brand-tint'}`}>
              {rotulo}
            </Link>
          ))}
        </nav>
      </div>

      <div className="my-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.lbl} className="rounded-[14px] border border-brand-line bg-brand-card px-4 py-4">
            <div className="text-[22px] font-bold tracking-[-0.01em]">{k.num}</div>
            <div className="mt-1 text-[12.5px] text-brand-ink-soft">{k.lbl}</div>
          </div>
        ))}
      </div>

      {sessoes.length === 0 ? (
        <Cartao><p className="py-6 text-center text-brand-ink-soft">Ninguém iniciou o quiz neste período.</p></Cartao>
      ) : (
        <div className="flex flex-col gap-4">
          <Cartao titulo="Sessões por dia"><Sparkline dados={sessoesPorDia(sessoes.map((s) => s.startedAt))} /></Cartao>

          <Cartao titulo="Funil de conversão">
            <p className="text-[12.5px] text-brand-ink-soft">Do início do quiz ao diagnóstico gerado; o percentual é sempre sobre as sessões iniciadas.</p>
            <Funnel etapas={funil(sessoes)} />
          </Cartao>

          <Cartao titulo="Onde as pessoas desistem">
            <p className="mb-1 text-[12.5px] text-brand-ink-soft">Sessões que não concluíram, pela última etapa em que ficaram.</p>
            <RankedBars titulo="Última etapa" dados={abandono.slice(0, 10).map((i) => ({ ...i, valor: rotuloEtapa(i.valor) }))} vazio="Ninguém abandonou neste período." />
          </Cartao>

          <Cartao titulo="Resultados">
            <p className="mb-4 text-[12.5px] text-brand-ink-soft">Só sessões concluídas ({concluidas.length}).</p>
            <div className="grid gap-8 sm:grid-cols-2">
              <PieChart titulo="Tipo de resultado" dados={porTipo} rotulos={ROTULO_TIPO} />
              <PieChart titulo="Prova recomendada" dados={porProva} rotulos={Object.fromEntries(porProva.map((p) => [p.valor, rotuloExame(p.valor)]))} />
              <RankedBars titulo="Turma indicada" dados={porTurma} rotulos={Object.fromEntries(porTurma.map((t) => [t.valor, rotuloTurma(Number(t.valor))]))} />
              <RankedBars titulo="Saídas antecipadas" dados={distribuicao(sessoes.map((s) => s.saidaTipo))} rotulos={ROTULOS_SAIDA} vazio="Ninguém saiu antes neste período." />
            </div>
          </Cartao>

          <Cartao titulo="Perfil das respostas">
            <p className="mb-4 text-[12.5px] text-brand-ink-soft">Todas as sessões que responderam cada pergunta, concluídas ou não.</p>
            <div className="grid gap-8 sm:grid-cols-2">
              {PERFIL.map((campo) => {
                const valores = sessoes.flatMap((s) => {
                  const v = (s.respostas as Record<string, string | undefined>)[campo]
                  return v ? (MULTI.has(campo) ? v.split('+') : [v]) : []
                })
                const dados = distribuicao(valores)
                return <RankedBars key={campo} titulo={tituloPergunta(campo).replace(/\{[^}]+\}/g, '…')} dados={dados} rotulos={rotulosDe(campo, dados.map((d) => d.valor))} />
              })}
            </div>
          </Cartao>

          <Cartao titulo="Teste de nível">
            <div className="grid gap-8 sm:grid-cols-2">
              <RankedBars titulo={`Acertos (de ${TOTAL_TESTE})`} dados={acertos.map((c, n) => ({ valor: `${n} ${n === 1 ? 'acerto' : 'acertos'}`, contagem: c, pct: pct(c, totalTestes) })).filter((d) => d.contagem > 0)} vazio="Ninguém terminou o teste neste período." />
              <RankedBars titulo="Questões mais erradas" dados={questoesMaisErradas(sessoes).slice(0, 5).map((q) => ({ valor: q.disciplina, contagem: q.erros, pct: q.pct }))} vazio="Ninguém terminou o teste neste período." />
            </div>
          </Cartao>

          <Cartao titulo="Origem do tráfego">
            <p className="mb-4 text-[12.5px] text-brand-ink-soft">Conversão = concluídas ÷ iniciadas de cada origem (UTM).</p>
            <div className="grid gap-8 lg:grid-cols-2">
              <TabelaOrigem titulo="Por source" dados={conversaoPorOrigem(sessoes, 'utmSource')} />
              <TabelaOrigem titulo="Por campanha" dados={conversaoPorOrigem(sessoes, 'utmCampaign')} />
            </div>
          </Cartao>

          <Cartao titulo="Prioridade comercial">
            <p className="mb-3 text-[12.5px] text-brand-ink-soft">Leads concluídos por prova, compromisso com a rotina e disposição de investir: onde focar a atenção do time.</p>
            {segmentosComerciais(sessoes).length === 0 ? <p className="text-[13px] text-brand-ink-soft">Sem leads concluídos neste período.</p> : (
              <table className="w-full text-left text-[13px]">
                <thead className="text-[12px] uppercase tracking-wide text-brand-ink-soft"><tr><th className="pb-1.5">Prova</th><th className="pb-1.5">Compromisso</th><th className="pb-1.5">Investir</th><th className="pb-1.5 text-right">Leads</th></tr></thead>
                <tbody>
                  {segmentosComerciais(sessoes).slice(0, 10).map((g) => (
                    <tr key={`${g.exame}|${g.compromisso}|${g.investir}`} className="border-t border-brand-line">
                      <td className="py-1.5 pr-2">{rotuloExame(g.exame)}</td><td className="py-1.5 pr-2">{rotuloResposta('compromisso', g.compromisso)}</td>
                      <td className="py-1.5 pr-2">{rotuloResposta('investir', g.investir)}</td><td className="py-1.5 text-right font-semibold tabular-nums">{g.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Cartao>
        </div>
      )}
    </div>
  )
}
