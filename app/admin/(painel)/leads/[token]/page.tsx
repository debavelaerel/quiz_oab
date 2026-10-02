import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ArrowLeft, Check, X } from 'lucide-react'
import data from '@/lib/oab/data.json'
import { ORDER } from '@/lib/oab/fluxo'
import { acertosDaSessao, TOTAL_TESTE } from '@/lib/adminAnalytics'
import {
  formatarData, mensagemAviso, rotuloDiagnostico, rotuloExame, rotuloResposta, rotuloStatus, rotuloTipo, rotuloTurma, tituloPergunta,
} from '@/lib/adminLabels'
import { linkWhatsappLead } from '@/lib/adminWhatsapp'
import CampoCopiavel from '@/components/admin/CampoCopiavel'
import DiagnosticoEmbutido from '@/components/admin/DiagnosticoEmbutido'
import FormAcao from '@/components/admin/FormAcao'
import { Alerta, BTN_CONTORNO, BTN_NEUTRO, BTN_PRIMARIO, Cartao, LINK, Pill, type Tom } from '@/components/admin/ui'
import { obterRepo } from '@/lib/server/container'
import { buscarDiagnosticoHtml } from '@/lib/server/diagnosticoService'
import { statusEfetivo } from '@/lib/server/quizService'
import type { DiagnosticoStatus, StatusSessao } from '@/lib/server/types'
import { isUuid } from '@/lib/server/uuid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TESTE = data.teste as { id: string; disciplina: string; gabarito: string }[]
const TOM_STATUS: Record<StatusSessao, Tom> = { concluido: 'ok', em_andamento: 'neutro', saiu: 'aviso' }
const TOM_DIAG: Record<DiagnosticoStatus, Tom> = { pronto: 'ok', pendente: 'aviso', erro: 'erro', desligado: 'neutro', nao_se_aplica: 'neutro' }

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,160px)_1fr] gap-3 border-b border-brand-line py-2 text-[14.5px] last:border-0">
      <dt className="text-[13px] text-brand-ink-soft">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

const titulo = (campo: string) => tituloPergunta(campo).replace(/\{[^}]+\}/g, '…')

/** http para localhost, https no resto: o link vai ser colado fora do admin (WhatsApp, CRM). */
function baseUrl(host: string | null): string {
  if (!host) return ''
  return `${/^(localhost|127\.|\[::1\])/.test(host) ? 'http' : 'https'}://${host}`
}

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
  const nome = (s.nomeCompleto ?? s.nome) ?? null
  const base = baseUrl((await headers()).get('host'))
  const linkPdf = base ? `${base}/api/diagnostico/${s.diagnosticoToken}` : null
  const temUtm = s.utmSource || s.utmMedium || s.utmCampaign || s.utmContent || s.utmTerm
  const acertos = acertosDaSessao(s)
  const whatsapp = linkWhatsappLead({
    nome: s.nome, telefone: s.whatsappNormalizado ?? s.whatsapp, exame: s.exame, turma: s.turma, linkPdf: diag === 'pronto' ? linkPdf : null,
  })
  const temDiagnostico = s.status === 'concluido' && !!s.codigo && diag !== 'nao_se_aplica'
  const html = temDiagnostico ? await buscarDiagnosticoHtml(s) : null

  return (
    <div>
      <Link href="/admin/leads" className={`${LINK} inline-flex items-center gap-1.5 text-[13px]`}><ArrowLeft size={14} strokeWidth={2.25} />Leads</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-bold tracking-[-0.01em]">
            {nome ?? 'Lead sem contato'}
            <span className="rounded-full bg-brand-yel px-3 py-1 font-mono text-[12px] font-semibold tracking-normal text-brand-roxo-2">#{s.refCurta}</span>
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill tom={TOM_STATUS[s.status]}>{rotuloStatus(s.status)}</Pill>
            {s.tipo && <Pill tom="neutro">{rotuloTipo(s.tipo)}</Pill>}
            {s.exame && <Pill tom="neutro">{rotuloExame(s.exame)}{s.turma ? ` · ${s.turma} dias` : ''}</Pill>}
            {diag && <Pill tom={TOM_DIAG[diag]}>Diagnóstico: {rotuloDiagnostico(diag)}</Pill>}
          </div>
          <p className="mt-2 text-[13px] text-brand-ink-soft">início {formatarData(s.startedAt)}{s.completedAt ? ` · concluído ${formatarData(s.completedAt)}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {diag === 'pronto' && <a href={`/api/admin/leads/${s.diagnosticoToken}/pdf`} className={BTN_PRIMARIO}>Baixar PDF</a>}
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener" className={BTN_NEUTRO}>Abrir no WhatsApp</a>}
          {podeRegenerar && (
            <FormAcao action={`/api/admin/leads/${s.diagnosticoToken}/regenerar`} rotulo="Regenerar" rotuloEnviando="Regenerando…" className={BTN_CONTORNO} />
          )}
          {diag === 'pronto' && s.email && (
            <form method="post" action={`/api/admin/leads/${s.diagnosticoToken}/reenviar-email`}>
              <button type="submit" className={BTN_CONTORNO}>Reenviar e-mail</button>
            </form>
          )}
        </div>
      </div>
      {podeRegenerar && <p className="mt-2 text-[12.5px] text-brand-ink-soft">Regenerar espera o serviço de PDF (pode levar até 1 minuto).</p>}

      {aviso && <Alerta tom={aviso.tom === 'ok' ? 'ok' : 'erro'} className="mt-4">{aviso.texto}</Alerta>}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <Cartao titulo="Contato">
            <dl>
              <Linha rotulo="Nome">{nome ?? '—'}</Linha>
              <Linha rotulo="E-mail">{s.email ?? '—'}</Linha>
              <Linha rotulo="WhatsApp">{s.whatsapp ?? '—'}</Linha>
              <Linha rotulo="Consentimento">{s.consentimentoEm ? `${formatarData(s.consentimentoEm)} · versão ${s.consentimentoVersao ?? '—'}` : '—'}</Linha>
              <Linha rotulo="Iniciado em">{formatarData(s.startedAt)}</Linha>
              <Linha rotulo="Concluído em">{formatarData(s.completedAt)}</Linha>
            </dl>
          </Cartao>

          {temUtm && (
            <Cartao titulo="Origem">
              <dl>
                {s.utmSource && <Linha rotulo="Source">{s.utmSource}</Linha>}
                {s.utmMedium && <Linha rotulo="Medium">{s.utmMedium}</Linha>}
                {s.utmCampaign && <Linha rotulo="Campaign">{s.utmCampaign}</Linha>}
                {s.utmContent && <Linha rotulo="Content">{s.utmContent}</Linha>}
                {s.utmTerm && <Linha rotulo="Term">{s.utmTerm}</Linha>}
              </dl>
            </Cartao>
          )}

          <Cartao titulo="Resultado">
            <dl>
              <Linha rotulo="Tipo">{rotuloTipo(s.tipo)}</Linha>
              <Linha rotulo="Prova">{rotuloExame(s.exame)}</Linha>
              <Linha rotulo="Turma">{rotuloTurma(s.turma)}</Linha>
              <Linha rotulo="Atalho">{rec?.atalho ? `${rotuloExame(rec.atalho.exame)} · ${rotuloTurma(rec.atalho.turma)} · ${rec.atalho.horas}h/dia` : '—'}</Linha>
              {s.saidaTipo && <Linha rotulo="Saída antecipada">{s.saidaTipo === 'cedo' ? 'Cedo demais' : '2ª fase'}</Linha>}
              <Linha rotulo="Código">{s.codigo ? <code className="break-all font-mono text-[12.5px]">{s.codigo}</code> : '—'}</Linha>
            </dl>
          </Cartao>

          <Cartao titulo="Perfil do lead">
            {ORDER.some((c) => respostas[c]) ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                {ORDER.filter((c) => respostas[c]).map((c) => (
                  <div key={c}>
                    <div className="text-[12.5px] leading-snug text-brand-ink-soft">{titulo(c)}</div>
                    <div className="mt-0.5 font-semibold">{rotuloResposta(c, respostas[c])}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-[13px] text-brand-ink-soft">Ainda não respondeu nenhuma pergunta.</p>}
          </Cartao>

          {s.teste.length > 0 && (
            <Cartao titulo={acertos !== null ? `Teste — ${acertos} de ${TOTAL_TESTE} acertos` : `Teste — ${s.teste.length} de ${TOTAL_TESTE} questões respondidas`}>
              {TESTE.map((q, i) => {
                const letra = s.teste[i]
                if (letra === undefined) return null
                const acertou = letra === q.gabarito
                return (
                  <div key={q.id} className="flex items-start gap-3 border-b border-brand-line py-2.5 last:border-0">
                    <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-white ${acertou ? 'bg-brand-green' : 'bg-brand-red'}`} aria-label={acertou ? 'acertou' : 'errou'}>
                      {acertou ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                    </span>
                    <div>
                      <div className="font-semibold">Questão {i + 1} · {q.disciplina}</div>
                      <div className="text-[13px] text-brand-ink-soft">{letra === 'X' ? 'não sabia responder' : `respondeu ${letra}`} · gabarito {q.gabarito}</div>
                    </div>
                  </div>
                )
              })}
            </Cartao>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Cartao titulo="Resumo">
            <p className="text-[14.5px] leading-relaxed text-brand-ink-soft">
              {s.exame ? <>Indicado para a <b className="text-brand-ink">{rotuloExame(s.exame)}</b>{s.turma ? <>, <b className="text-brand-ink">{rotuloTurma(s.turma)}</b></> : null}.</> : 'Sem prova indicada.'}{' '}
              {acertos !== null ? `Fez ${acertos} de ${TOTAL_TESTE} no teste.` : ''}{' '}
              {respostas.horas ? `Estuda ${rotuloResposta('horas', respostas.horas).toLowerCase()}.` : ''}
            </p>
          </Cartao>

          <Cartao titulo="Links para o CRM">
            <p className="mb-3 text-[12.5px] text-brand-ink-soft">Não expiram nem trocam: dá para colar direto no CRM ou no WhatsApp.</p>
            {linkPdf ? <CampoCopiavel label="Diagnóstico em PDF" valor={linkPdf} /> : <p className="text-[13px] text-brand-ink-soft">Indisponível sem o endereço do site.</p>}
          </Cartao>

          <Cartao titulo="Diagnóstico (geração)">
            <dl>
              <Linha rotulo="Status">{rotuloDiagnostico(diag)}</Linha>
              {s.diagnosticoPdfErro && <Linha rotulo="Erro"><span className="text-brand-red">{s.diagnosticoPdfErro}</span></Linha>}
              <Linha rotulo="Solicitado em">{formatarData(s.diagnosticoSolicitadoEm)}</Linha>
              <Linha rotulo="E-mail enviado em">{formatarData(s.emailEnviadoEm)}</Linha>
              {s.emailErro && <Linha rotulo="Erro do e-mail"><span className="text-brand-red">{s.emailErro}</span></Linha>}
            </dl>
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
      </div>

      {html ? (
        <DiagnosticoEmbutido html={'html' in html ? html.html : undefined} erro={'erro' in html ? html.erro : undefined} />
      ) : (
        <Cartao titulo="Diagnóstico completo" className="mt-4">
          <p className="text-[13px] text-brand-ink-soft">
            {s.status !== 'concluido' ? 'O lead ainda não concluiu o quiz, então não há diagnóstico.' : 'Este lead não recebe diagnóstico (' + rotuloTipo(s.tipo).toLowerCase() + ').'}
          </p>
        </Cartao>
      )}
    </div>
  )
}
