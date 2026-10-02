import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import data from '@/lib/oab/data.json'
import { ORDER } from '@/lib/oab/fluxo'
import {
  formatarData, mensagemAviso, rotuloDiagnostico, rotuloExame, rotuloResposta, rotuloStatus, rotuloTeste, rotuloTipo, rotuloTurma, tituloPergunta,
} from '@/lib/adminLabels'
import FormAcao from '@/components/admin/FormAcao'
import { Alerta, BTN_CONTORNO, BTN_PRIMARIO, Cartao, LINK } from '@/components/admin/ui'
import { obterRepo } from '@/lib/server/container'
import { statusEfetivo } from '@/lib/server/quizService'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'

const GABARITO = (data.teste as { gabarito: string }[]).map((q) => q.gabarito)

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,160px)_1fr] gap-3 border-b border-brand-line py-2 text-[14.5px] last:border-0">
      <dt className="text-[13px] text-brand-ink-soft">{rotulo}</dt>
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

  return (
    <div>
      <Link href="/admin/leads" className={`${LINK} text-[13px]`}>← Leads</Link>
      <h1 className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-bold tracking-[-0.01em]">
        {(s.nomeCompleto ?? s.nome) ?? 'Lead sem contato'}
        <span className="rounded-full bg-brand-yel px-3 py-1 font-mono text-[12px] font-semibold tracking-normal text-brand-roxo-2">#{s.refCurta}</span>
      </h1>
      <p className="mt-0.5 text-[13px] text-brand-ink-soft">{rotuloStatus(s.status)} · início {formatarData(s.startedAt)}{s.completedAt ? ` · concluído ${formatarData(s.completedAt)}` : ''}</p>

      {aviso && (
        <Alerta tom={aviso.tom === 'ok' ? 'ok' : 'erro'} className="mt-4">{aviso.texto}</Alerta>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Resultado">
          <dl>
            <Linha rotulo="Tipo">{rotuloTipo(s.tipo)}</Linha>
            <Linha rotulo="Prova">{rotuloExame(s.exame)}</Linha>
            <Linha rotulo="Turma">{rotuloTurma(s.turma)}</Linha>
            <Linha rotulo="Atalho">{rec?.atalho ? `${rotuloExame(rec.atalho.exame)} · ${rotuloTurma(rec.atalho.turma)} · ${rec.atalho.horas}h/dia` : '—'}</Linha>
            {s.saidaTipo && <Linha rotulo="Saída antecipada">{s.saidaTipo === 'cedo' ? 'Cedo demais' : '2ª fase'}</Linha>}
            <Linha rotulo="Código">{s.codigo ? <code className="break-all font-mono text-[12.5px]">{s.codigo}</code> : '—'}</Linha>
            <Linha rotulo="Clicou no WhatsApp">{formatarData(s.whatsappClicadoEm)}</Linha>
          </dl>
        </Cartao>

        <Cartao titulo="Contato">
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
        </Cartao>

        <Cartao titulo="Diagnóstico">
          <dl>
            <Linha rotulo="Status">{rotuloDiagnostico(diag)}</Linha>
            {s.diagnosticoPdfErro && <Linha rotulo="Erro"><span className="text-brand-red">{s.diagnosticoPdfErro}</span></Linha>}
            <Linha rotulo="Solicitado em">{formatarData(s.diagnosticoSolicitadoEm)}</Linha>
            <Linha rotulo="E-mail enviado em">{formatarData(s.emailEnviadoEm)}</Linha>
            {s.emailErro && <Linha rotulo="Erro do e-mail"><span className="text-brand-red">{s.emailErro}</span></Linha>}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {diag === 'pronto' && (
              <a href={`/api/admin/leads/${s.diagnosticoToken}/pdf`} className={BTN_PRIMARIO}>Baixar PDF</a>
            )}
            {podeRegenerar && (
              <FormAcao action={`/api/admin/leads/${s.diagnosticoToken}/regenerar`} rotulo="Regenerar" rotuloEnviando="Regenerando…" className={BTN_CONTORNO} />
            )}
            {diag === 'pronto' && s.email && (
              <form method="post" action={`/api/admin/leads/${s.diagnosticoToken}/reenviar-email`}>
                <button type="submit" className={BTN_CONTORNO}>Reenviar e-mail</button>
              </form>
            )}
          </div>
          {podeRegenerar && <p className="mt-2 text-[12.5px] text-brand-ink-soft">Regenerar espera o serviço de PDF (pode levar até 1 minuto).</p>}
        </Cartao>

        <Cartao titulo="Outras tentativas">
          {outras.length === 0 ? (
            <p className="text-[13px] text-brand-ink-soft">Nenhuma outra tentativa com o mesmo e-mail ou WhatsApp.</p>
          ) : (
            <ul className="space-y-1.5 text-[14.5px]">
              {outras.map((o) => {
                const destaque = o.id === maisRecenteConcluida?.id
                return (
                  <li key={o.id} className={`rounded-xl px-3 py-2 ${destaque ? 'border border-brand-yel/60 bg-brand-yel-tint' : ''}`}>
                    <Link href={`/admin/leads/${o.diagnosticoToken}`} className={`${LINK} font-mono font-semibold`}>#{o.refCurta}</Link>{' '}
                    · {formatarData(o.completedAt ?? o.startedAt)} · {rotuloStatus(o.status)} · {rotuloTipo(o.tipo)}
                    {destaque && <span className="ml-2 text-[12px] font-semibold text-brand-yel-text">mais recente concluída</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </Cartao>
      </div>

      <div className="mt-4">
        <Cartao titulo="Respostas">
          <dl>
            {ORDER.filter((c) => respostas[c]).map((c) => (
              <Linha key={c} rotulo={c}>
                <div className="text-[12.5px] text-brand-ink-soft">{titulo(c)}</div>
                {rotuloResposta(c, respostas[c])}
              </Linha>
            ))}
            <Linha rotulo="teste">
              <span className="font-mono">{rotuloTeste(s.teste)}</span>
              {s.teste.length > 0 && <div className="text-[12.5px] text-brand-ink-soft">gabarito: <span className="font-mono">{GABARITO.join(' ')}</span></div>}
            </Linha>
          </dl>
        </Cartao>
      </div>
    </div>
  )
}
