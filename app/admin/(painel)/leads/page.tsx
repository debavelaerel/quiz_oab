import Link from 'next/link'
import { lerFiltros, queryFiltros } from '@/lib/adminFiltros'
import { EXAMES, ROTULO_STATUS, ROTULO_TIPO, formatarData, rotuloDiagnostico, rotuloExame, rotuloStatus, rotuloTipo } from '@/lib/adminLabels'
import { obterRepo } from '@/lib/server/container'
import { statusEfetivo } from '@/lib/server/quizService'
import type { DiagnosticoStatus } from '@/lib/server/types'

export const runtime = 'nodejs'

const POR_PAGINA = 25

const COR_DIAG: Record<DiagnosticoStatus, string> = {
  pronto: 'bg-emerald-50 text-emerald-700',
  pendente: 'bg-amber-50 text-amber-700',
  erro: 'bg-red-50 text-red-700',
  desligado: 'bg-slate-100 text-slate-600',
  nao_se_aplica: 'bg-slate-100 text-slate-500',
}

type SP = Record<string, string | string[] | undefined>

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const filtros = lerFiltros(await searchParams)
  const { busca, tipo, exame, status, pagina } = filtros
  const { sessoes, total } = await obterRepo().listar({ busca, tipo, exame, status, pagina, porPagina: POR_PAGINA })
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const agora = new Date()
  const campo = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-slate-500">{total} {total === 1 ? 'resultado' : 'resultados'}</p>
        </div>
        <a href={`/api/admin/export${queryFiltros(filtros, { semPagina: true })}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Exportar CSV
        </a>
      </div>

      <form method="get" className="mt-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input name="busca" defaultValue={busca ?? ''} placeholder="Ref, nome, e-mail ou WhatsApp" aria-label="Buscar" className={`${campo} min-w-[240px] flex-1`} />
        <select name="tipo" defaultValue={tipo ?? ''} aria-label="Tipo" className={campo}>
          <option value="">Todos os tipos</option>
          {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select name="exame" defaultValue={exame ?? ''} aria-label="Prova" className={campo}>
          <option value="">Todas as provas</option>
          {EXAMES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ''} aria-label="Status" className={campo}>
          <option value="">Todos os status</option>
          {Object.entries(ROTULO_STATUS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <button type="submit" className="rounded-lg border border-slate-900 px-4 py-2 text-sm font-semibold">Filtrar</button>
        {(busca || tipo || exame || status) && <Link href="/admin/leads" className="self-center px-2 text-sm text-slate-500 underline">Limpar</Link>}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Ref</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Resultado</th>
              <th className="px-3 py-2">Status</th><th className="px-3 py-2">Diagnóstico</th><th className="px-3 py-2">Início</th>
            </tr>
          </thead>
          <tbody>
            {sessoes.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Nenhum lead encontrado.</td></tr>
            )}
            {sessoes.map((s) => {
              const diag = statusEfetivo(s, agora)
              return (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/admin/leads/${s.diagnosticoToken}`} className="font-semibold text-slate-900 underline decoration-slate-300">#{s.refCurta}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/leads/${s.diagnosticoToken}`}>{(s.nomeCompleto ?? s.nome) ?? <span className="text-slate-400">sem contato</span>}</Link>
                    {s.email && <div className="text-xs text-slate-500">{s.email}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {rotuloTipo(s.tipo)}
                    {s.exame && <div className="text-xs text-slate-500">{rotuloExame(s.exame)}{s.turma ? ` · ${s.turma} dias` : ''}</div>}
                  </td>
                  <td className="px-3 py-2">{rotuloStatus(s.status)}</td>
                  <td className="px-3 py-2">
                    {diag ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR_DIAG[diag]}`}>{rotuloDiagnostico(diag)}</span> : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatarData(s.startedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
          {pagina > 1 ? <Link href={`/admin/leads${queryFiltros(filtros, { pagina: pagina - 1 })}`} className="underline">← Anterior</Link> : <span />}
          <span className="text-slate-500">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas ? <Link href={`/admin/leads${queryFiltros(filtros, { pagina: pagina + 1 })}`} className="underline">Próxima →</Link> : <span />}
        </nav>
      )}
    </div>
  )
}
