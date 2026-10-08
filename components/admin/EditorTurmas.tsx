'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { validarEdicoes, TURMAS_PADRAO, type EdicaoTurma, type ErroTurma } from '@/lib/oab/turmas'
import { Alerta, BTN_CONTORNO, BTN_NEUTRO, CAMPO, CARTAO, Pill, type Tom } from './ui'

type Props = { inicial: EdicaoTurma[]; atualizadoEm: string | null; hoje: string; exames: { id: string; nome: string }[] }
type Campo = 'vendasIni' | 'vendasFim' | 'inicio' | 'inicio2'

const norm = (l: EdicaoTurma[]) =>
  JSON.stringify(l.map((t) => ({ ...t, inicio2: t.inicio2 || undefined, aConfirmar: !!t.aConfirmar, fimVendasAConfirmar: !!t.fimVendasAConfirmar })))
const igual = (a: EdicaoTurma[], b: EdicaoTurma[]) => norm(a) === norm(b)
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

function situacao(t: EdicaoTurma, hoje: string): { tom: Tom; texto: string } | null {
  if (!t.vendasIni || !t.vendasFim) return null
  if (hoje > t.vendasFim) return { tom: 'neutro', texto: 'Encerrada' }
  if (hoje < t.vendasIni) return { tom: 'aviso', texto: 'Abre em breve' }
  return { tom: 'ok', texto: 'À venda agora' }
}

export default function EditorTurmas({ inicial, atualizadoEm, hoje, exames }: Props) {
  const router = useRouter()
  const [salvas, setSalvas] = useState(inicial)
  const [turmas, setTurmas] = useState(inicial)
  const [ultima, setUltima] = useState(atualizadoEm)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmaPadrao, setConfirmaPadrao] = useState(false)

  const validacao = useMemo(() => validarEdicoes(turmas), [turmas])
  const erros: ErroTurma[] = validacao.ok ? [] : validacao.erros
  const errosDe = (t: EdicaoTurma) => erros.filter((e) => e.exame === t.exame && e.dias === t.dias)
  const sujo = !igual(turmas, salvas)

  const mudar = (t: EdicaoTurma, p: Partial<EdicaoTurma>) => {
    setAviso(null)
    // Preencher o fim das vendas de uma turma marcada "a partir de" quer dizer que o fim foi divulgado.
    const limpaFim = 'vendasFim' in p ? { fimVendasAConfirmar: false } : {}
    setTurmas((l) => l.map((x) => (x.exame === t.exame && x.dias === t.dias ? { ...x, ...p, ...limpaFim } : x)))
  }

  async function chamar(metodo: 'PUT' | 'DELETE', corpo?: unknown) {
    setOcupado(true); setAviso(null)
    try {
      const r = await fetch('/api/admin/turmas', { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setAviso({ tom: 'erro', texto: j.erro ?? 'Não foi possível salvar agora.' })
        return false
      }
      return true
    } catch {
      setAviso({ tom: 'erro', texto: 'Sem conexão. Tente de novo.' })
      return false
    } finally { setOcupado(false) }
  }

  async function salvar() {
    if (!validacao.ok || !(await chamar('PUT', { turmas: validacao.edicoes }))) return
    setSalvas(validacao.edicoes); setTurmas(validacao.edicoes); setUltima(new Date().toISOString())
    setAviso({ tom: 'ok', texto: 'Datas salvas. Valem para quem responder o quiz a partir de agora (em até 1 minuto).' })
    router.refresh()
  }

  async function restaurar() {
    setConfirmaPadrao(false)
    if (!(await chamar('DELETE'))) return
    const padrao = TURMAS_PADRAO.map((t) => ({ ...t })) as EdicaoTurma[]
    setSalvas(padrao); setTurmas(padrao); setUltima(null)
    setAviso({ tom: 'ok', texto: 'Datas padrão restauradas.' })
    router.refresh()
  }

  const data = (t: EdicaoTurma, campo: Campo, rotulo: string) => {
    const erro = errosDe(t).find((e) => e.campo === campo)
    return (
      <input
        type="date" value={t[campo] ?? ''} aria-label={`${rotulo}, turma de ${t.dias} dias, OAB ${t.exame}`}
        aria-invalid={erro ? true : undefined} title={erro?.mensagem}
        onChange={(e) => mudar(t, { [campo]: e.target.value || undefined })}
        className={`${CAMPO} !min-w-0 !px-3 !py-2 !text-[14px] ${erro ? '!border-brand-red !bg-brand-red-tint' : ''}`}
      />
    )
  }
  const confirmar = (t: EdicaoTurma) => (
    <div className="flex justify-center">
      <input
        type="checkbox" checked={t.aConfirmar === true} onChange={(e) => mudar(t, { aConfirmar: e.target.checked })}
        aria-label={`Data a confirmar, turma de ${t.dias} dias, OAB ${t.exame}`} className="h-5 w-5 accent-[#5a009f]"
      />
    </div>
  )
  const TH = 'px-2 pb-2.5 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-brand-ink-dim'

  return (
    <>
      {aviso && <Alerta tom={aviso.tom} className="mb-4">{aviso.texto}</Alerta>}
      <div className="space-y-5">
        {exames.map((ex) => (
          <section key={ex.id} className={`${CARTAO} overflow-hidden max-lg:overflow-x-auto`}>
            <h2 className="bg-brand-tint px-5 py-3 text-[16px] font-bold text-brand-roxo">{ex.nome}</h2>
            <table className="w-full px-3 text-[14px] max-lg:min-w-[860px] lg:table-fixed">
              <thead>
                <tr>
                  <th className={`${TH} w-[84px] pl-5 pt-3.5`}>Turma</th>
                  <th className={`${TH} pt-3.5`}>Abre as vendas</th><th className={`${TH} pt-3.5`}>Fecha as vendas</th>
                  <th className={`${TH} pt-3.5`}>Início</th><th className={`${TH} pt-3.5`}>Início 2</th>
                  <th className={`${TH} w-[110px] pt-3.5 text-center`}>Data a confirmar</th><th className={`${TH} w-[150px] pr-5 pt-3.5`}>Hoje</th>
                </tr>
              </thead>
              <tbody>
                {turmas.filter((t) => t.exame === ex.id).map((t) => {
                  const st = situacao(t, hoje)
                  const es = errosDe(t)
                  return [
                    <tr key={`${t.exame}-${t.dias}`} className="border-t border-brand-line">
                      <td className="whitespace-nowrap py-3 pl-5 pr-2 font-semibold">{t.dias} dias</td>
                      <td className="px-2 py-3">{data(t, 'vendasIni', 'Abre as vendas')}</td>
                      <td className="px-2 py-3">{data(t, 'vendasFim', 'Fecha as vendas')}</td>
                      <td className="px-2 py-3">{data(t, 'inicio', 'Início')}</td>
                      <td className="px-2 py-3">{data(t, 'inicio2', 'Início 2')}</td>
                      <td className="px-2 py-3">{confirmar(t)}</td>
                      <td className="whitespace-nowrap py-3 pl-2 pr-5">{st && <Pill tom={st.tom}>{st.texto}</Pill>}</td>
                    </tr>,
                    es.length > 0 && (
                      <tr key={`${t.exame}-${t.dias}-erro`}><td colSpan={7} className="bg-brand-red-tint px-5 py-2 text-[13px] text-brand-red">⚠ {es.map((e) => e.mensagem).join('. ')}.</td></tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <p className="mx-0.5 mt-4 max-w-3xl text-[13px] text-brand-ink-dim">
        “Data a confirmar” esconde as datas da turma para quem responde o quiz (aparece “data a confirmar”); as datas continuam valendo
        internamente para decidir se a turma está à venda. Uma turma que mostra “a partir de” (só a abertura divulgada) volta ao normal quando você altera o fim das vendas.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-brand-line bg-brand-card">
        <div className="mx-auto flex max-w-[70rem] flex-wrap items-center gap-3 px-5 py-3.5 sm:px-8 lg:px-12">
          {confirmaPadrao ? (
            <>
              <span className="text-[13.5px] text-brand-ink">Voltar todas as turmas às datas do arquivo padrão?</span>
              <button type="button" className={BTN_NEUTRO} disabled={ocupado} onClick={() => void restaurar()}>Sim, restaurar</button>
              <button type="button" className={BTN_CONTORNO} onClick={() => setConfirmaPadrao(false)}>Cancelar</button>
            </>
          ) : (
            <>
              <button type="button" className={BTN_CONTORNO} disabled={ocupado} onClick={() => setConfirmaPadrao(true)}>Voltar às datas padrão</button>
              <span className="min-w-0 flex-1 text-[13px] text-brand-ink-dim">
                {erros.length > 0 ? `${new Set(erros.map((e) => `${e.exame}-${e.dias}`)).size} turma(s) com data para conferir` : ultima ? `Última alteração: ${quando(ultima)}` : 'Usando as datas padrão'}
              </span>
              <button type="button" className={BTN_CONTORNO} disabled={!sujo || ocupado} onClick={() => { setTurmas(salvas); setAviso(null) }}>Descartar</button>
              <button type="button" className={BTN_NEUTRO} disabled={!sujo || !validacao.ok || ocupado} onClick={() => void salvar()}>Salvar datas</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
