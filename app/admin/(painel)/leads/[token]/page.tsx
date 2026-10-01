import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import data from '@/lib/oab/data.json'
import { ORDER } from '@/lib/oab/fluxo'
import {
  formatarData, mensagemAviso, rotuloDiagnostico, rotuloExame, rotuloResposta, rotuloStatus, rotuloTeste, rotuloTipo, rotuloTurma, tituloPergunta,
} from '@/lib/adminLabels'
import FormAcao from '@/components/admin/FormAcao'
import { obterRepo } from '@/lib/server/container'
import { statusEfetivo } from '@/lib/server/quizService'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

const GABARITO = (data.teste as { gabarito: string }[]).map((q) => q.gabarito)

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {children}
    </section>
  )
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,160px)_1fr] gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

const titulo = (campo: string) => tituloPergunta(campo).replace(/\{[^}]+\}/g, '…')

export default async function LeadDetalhePage({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await params
  if (!isUuid(token)) notFound()
  const repo = obterRepo()
  const s = await repo.buscarPorDiagnosticoToken(token)
  if (!s) notFound()
  const sp = await searchParams
  const aviso = mensagemAviso(typeof sp.aviso === 'string' ? sp.aviso : undefined)
  const outras = await repo.outrasTentativas(s)
  const maisRecenteConcluida = outras.filter((o) => o.status === 'concluido')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
  const diag = statusEfetivo(s)
  const podeRegenerar = diag === 'erro' || diag === 'pendente' || diag === 'desligado'
  const respostas = s.respostas as Record<string, string | undefined>
  const rec = s.recomendacao
  const botao = 'rounded-lg border px-3 py-1.5 text-sm font-semibold'

  return (
    <div>
      <Link href="/admin/leads" className="text-sm text-slate-500 underline">← Leads</Link>
      <h1 className="mt-2 text-2xl font-bold">
        {(s.nomeCompleto ?? s.nome) ?? 'Lead sem contato'} <span className="font-mono text-slate-400">#{s.refCurta}</span>
      </h1>
      <p className="text-sm text-slate-500">{rotuloStatus(s.status)} · início {formatarData(s.startedAt)}{s.completedAt ? ` · concluído ${formatarData(s.completedAt)}` : ''}</p>

      {aviso && (
        <p role="status" className={`mt-4 rounded-lg border px-4 py-2 text-sm ${aviso.tom === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {aviso.texto}
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Resultado">
          <dl>
            <Linha rotulo="Tipo">{rotuloTipo(s.tipo)}</Linha>
            <Linha rotulo="Prova">{rotuloExame(s.exame)}</Linha>
            <Linha rotulo="Turma">{rotuloTurma(s.turma)}</Linha>
            <Linha rotulo="Atalho">{rec?.atalho ? `${rotuloExame(rec.atalho.exame)} · ${rotuloTurma(rec.atalho.turma)} · ${rec.atalho.horas}h/dia` : '—'}</Linha>
            {s.saidaTipo && <Linha rotulo="Saída antecipada">{s.saidaTipo === 'cedo' ? 'Cedo demais' : '2ª fase'}</Linha>}
            <Linha rotulo="Código">{s.codigo ? <code className="break-all text-xs">{s.codigo}</code> : '—'}</Linha>
            <Linha rotulo="Clicou no WhatsApp">{formatarData(s.whatsappClicadoEm)}</Linha>
          </dl>
        </Bloco>

        <Bloco titulo="Contato">
          <dl>
            <Linha rotulo="Nome">{(s.nomeCompleto ?? s.nome) ?? '—'}</Linha>
            <Linha rotulo="E-mail">{s.email ?? '—'}</Linha>
            <Linha rotulo="WhatsApp">{s.whatsapp ?? '—'}</Linha>
            <Linha rotulo="Consentimento">{s.consentimentoEm ? `${formatarData(s.consentimentoEm)} · versão ${s.consentimentoVersao ?? '—'}` : '—'}</Linha>
            <Linha rotulo="UTM source">{s.utmSource ?? '—'}</Linha>
            <Linha rotulo="UTM medium">{s.utmMedium ?? '—'}</Linha>
            <Linha rotulo="UTM campaign">{s.utmCampaign ?? '—'}</Linha>
            <Linha rotulo="UTM content">{s.utmContent ?? '—'}</Linha>
            <Linha rotulo="UTM term">{s.utmTerm ?? '—'}</Linha>
          </dl>
        </Bloco>

        <Bloco titulo="Diagnóstico">
          <dl>
            <Linha rotulo="Status">{rotuloDiagnostico(diag)}</Linha>
            {s.diagnosticoPdfErro && <Linha rotulo="Erro"><span className="text-red-700">{s.diagnosticoPdfErro}</span></Linha>}
            <Linha rotulo="Solicitado em">{formatarData(s.diagnosticoSolicitadoEm)}</Linha>
            <Linha rotulo="E-mail enviado em">{formatarData(s.emailEnviadoEm)}</Linha>
            {s.emailErro && <Linha rotulo="Erro do e-mail"><span className="text-red-700">{s.emailErro}</span></Linha>}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {diag === 'pronto' && (
              <a href={`/api/admin/leads/${s.diagnosticoToken}/pdf`} className={`${botao} border-slate-900 bg-slate-900 text-white`}>Baixar PDF</a>
            )}
            {podeRegenerar && (
              <FormAcao action={`/api/admin/leads/${s.diagnosticoToken}/regenerar`} rotulo="Regenerar" rotuloEnviando="Regenerando…" className={`${botao} border-slate-300`} />
            )}
            {diag === 'pronto' && s.email && (
              <form method="post" action={`/api/admin/leads/${s.diagnosticoToken}/reenviar-email`}>
                <button type="submit" className={`${botao} border-slate-300`}>Reenviar e-mail</button>
              </form>
            )}
          </div>
          {podeRegenerar && <p className="mt-2 text-xs text-slate-500">Regenerar espera o serviço de PDF (pode levar até 1 minuto).</p>}
        </Bloco>

        <Bloco titulo="Outras tentativas">
          {outras.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma outra tentativa com o mesmo e-mail ou WhatsApp.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {outras.map((o) => {
                const destaque = o.id === maisRecenteConcluida?.id
                return (
                  <li key={o.id} className={`rounded-lg px-2 py-1.5 ${destaque ? 'border border-amber-300 bg-amber-50' : ''}`}>
                    <Link href={`/admin/leads/${o.diagnosticoToken}`} className="font-mono font-semibold underline">#{o.refCurta}</Link>{' '}
                    · {formatarData(o.completedAt ?? o.startedAt)} · {rotuloStatus(o.status)} · {rotuloTipo(o.tipo)}
                    {destaque && <span className="ml-2 text-xs font-semibold text-amber-800">mais recente concluída</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </Bloco>
      </div>

      <div className="mt-4">
        <Bloco titulo="Respostas">
          <dl>
            {ORDER.filter((c) => respostas[c]).map((c) => (
              <Linha key={c} rotulo={c}>
                <div className="text-xs text-slate-500">{titulo(c)}</div>
                {rotuloResposta(c, respostas[c])}
              </Linha>
            ))}
            <Linha rotulo="teste">
              <span className="font-mono">{rotuloTeste(s.teste)}</span>
              {s.teste.length > 0 && <div className="text-xs text-slate-500">gabarito: <span className="font-mono">{GABARITO.join(' ')}</span></div>}
            </Linha>
          </dl>
        </Bloco>
      </div>
    </div>
  )
}
