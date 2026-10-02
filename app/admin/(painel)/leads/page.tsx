import Link from 'next/link'
import { lerFiltros, queryFiltros } from '@/lib/adminFiltros'
import { EXAMES, ROTULO_STATUS, ROTULO_TIPO, formatarData, rotuloDiagnostico, rotuloExame, rotuloStatus, rotuloTipo } from '@/lib/adminLabels'
import { obterRepo } from '@/lib/server/container'
import { statusEfetivo } from '@/lib/server/quizService'
import type { DiagnosticoStatus } from '@/lib/server/types'
import { BTN_CONTORNO, BTN_NEUTRO, BTN_PRIMARIO, Badge, CAMPO, CARTAO, LINK, type Tom } from '@/components/admin/ui'

export const runtime = 'nodejs'

const POR_PAGINA = 25

const TOM_DIAG: Record<DiagnosticoStatus, Tom> = {
  pronto: 'ok',
  pendente: 'aviso',
  erro: 'erro',
  desligado: 'neutro',
  nao_se_aplica: 'neutro',
}

type SP = Record<string, string | string[] | undefined>

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const filtros = lerFiltros(await searchParams)
  const { busca, tipo, exame, status, pagina } = filtros
  const { sessoes, total } = await obterRepo().listar({ busca, tipo, exame, status, pagina, porPagina: POR_PAGINA })
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const agora = new Date()

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.01em]">Leads</h1>
          <p className="mt-0.5 text-[13px] text-brand-ink-soft">{total} {total === 1 ? 'resultado' : 'resultados'}</p>
        </div>
        <a href={`/api/admin/export${queryFiltros(filtros, { semPagina: true })}`} className={BTN_PRIMARIO}>
          Exportar CSV
        </a>
      </div>

      <form method="get" className={`${CARTAO} mt-5 flex flex-wrap items-center gap-2.5 p-3`}>
        <input name="busca" defaultValue={busca ?? ''} placeholder="Ref, nome, e-mail ou WhatsApp" aria-label="Buscar" className={`${CAMPO} min-w-[240px] flex-1`} />
        <select name="tipo" defaultValue={tipo ?? ''} aria-label="Tipo" className={`${CAMPO} sm:w-auto`}>
          <option value="">Todos os tipos</option>
          {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select name="exame" defaultValue={exame ?? ''} aria-label="Prova" className={`${CAMPO} sm:w-auto`}>
          <option value="">Todas as provas</option>
          {EXAMES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ''} aria-label="Status" className={`${CAMPO} sm:w-auto`}>
          <option value="">Todos os status</option>
          {Object.entries(ROTULO_STATUS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <button type="submit" className={BTN_NEUTRO}>Filtrar</button>
        {(busca || tipo || exame || status) && <Link href="/admin/leads" className={`${LINK} px-1`}>Limpar</Link>}
      </form>

      <div className={`${CARTAO} mt-4 hidden overflow-x-auto sm:block`}>
        <table className="w-full min-w-[760px] text-left text-[14.5px]">
          <thead className="bg-brand-tint text-[12.5px] font-semibold uppercase tracking-wide text-brand-ink-soft">
            <tr>
              <th className="px-4 py-3">Ref</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Diagnóstico</th><th className="px-4 py-3">Início</th>
            </tr>
          </thead>
          <tbody>
            {sessoes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-brand-ink-soft">Nenhum lead encontrado.</td></tr>
            )}
            {sessoes.map((s) => {
              const diag = statusEfetivo(s, agora)
              return (
                <tr key={s.id} className="border-t border-brand-line transition-colors hover:bg-brand-tint/60">
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/admin/leads/${s.diagnosticoToken}`} className={`${LINK} font-semibold no-underline`}>#{s.refCurta}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/leads/${s.diagnosticoToken}`} className="font-medium text-brand-ink hover:text-brand-roxo">{(s.nomeCompleto ?? s.nome) ?? <span className="font-normal text-brand-ink-soft">sem contato</span>}</Link>
                    {s.email && <div className="text-[12.5px] text-brand-ink-soft">{s.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {rotuloTipo(s.tipo)}
                    {s.exame && <div className="text-[12.5px] text-brand-ink-soft">{rotuloExame(s.exame)}{s.turma ? ` · ${s.turma} dias` : ''}</div>}
                  </td>
                  <td className="px-4 py-3">{rotuloStatus(s.status)}</td>
                  <td className="px-4 py-3">
                    {diag ? <Badge tom={TOM_DIAG[diag]}>{rotuloDiagnostico(diag)}</Badge> : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-brand-ink-soft">{formatarData(s.startedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-2.5 sm:hidden" aria-label="Leads">
        {sessoes.length === 0 && <li className={`${CARTAO} px-4 py-10 text-center text-brand-ink-soft`}>Nenhum lead encontrado.</li>}
        {sessoes.map((s) => {
          const diag = statusEfetivo(s, agora)
          return (
            <li key={s.id}>
              <Link href={`/admin/leads/${s.diagnosticoToken}`} className={`${CARTAO} block p-4 transition-colors hover:bg-brand-tint/60`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-brand-ink">{(s.nomeCompleto ?? s.nome) ?? <span className="font-normal text-brand-ink-soft">sem contato</span>}</div>
                    {s.email && <div className="truncate text-[12.5px] text-brand-ink-soft">{s.email}</div>}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-yel px-2.5 py-0.5 font-mono text-[12px] font-semibold text-brand-roxo-2">#{s.refCurta}</span>
                </div>
                <div className="mt-2 text-[14.5px]">
                  {rotuloTipo(s.tipo)}
                  {s.exame && <span className="text-[12.5px] text-brand-ink-soft"> · {rotuloExame(s.exame)}{s.turma ? ` · ${s.turma} dias` : ''}</span>}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-brand-ink-soft">
                  {diag ? <Badge tom={TOM_DIAG[diag]}>{rotuloDiagnostico(diag)}</Badge> : null}
                  <span>{rotuloStatus(s.status)}</span>
                  <span>{formatarData(s.startedAt)}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {totalPaginas > 1 && (
        <nav className="mt-5 flex items-center justify-between" aria-label="Paginação">
          {pagina > 1 ? <Link href={`/admin/leads${queryFiltros(filtros, { pagina: pagina - 1 })}`} className={BTN_CONTORNO}>← Anterior</Link> : <span />}
          <span className="text-[13px] text-brand-ink-soft">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas ? <Link href={`/admin/leads${queryFiltros(filtros, { pagina: pagina + 1 })}`} className={BTN_CONTORNO}>Próxima →</Link> : <span />}
        </nav>
      )}
    </div>
  )
}
