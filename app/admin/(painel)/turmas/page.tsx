import EditorTurmas from '@/components/admin/EditorTurmas'
import { obterTurmas } from '@/lib/server/container'
import { hojeSaoPaulo } from '@/lib/server/hoje'
import data from '@/lib/oab/data.json'

export const runtime = 'nodejs'
// As datas podem mudar a qualquer momento: nunca pré-renderizar.
export const dynamic = 'force-dynamic'

export default async function TurmasPage() {
  const { edicoes, atualizadoEm } = await obterTurmas().atuais({ fresco: true })
  return (
    <div className="mx-auto max-w-5xl pb-20">
      <h1 className="text-[24px] font-bold text-brand-roxo">Datas das turmas</h1>
      <p className="mb-5 mt-1 max-w-3xl text-[14.5px] text-brand-ink-soft">
        Altere as datas de venda e de início. A mudança vale para quem responder o quiz depois de salvar (em cerca de 1 minuto).
        Resultados e PDFs que já foram gerados não mudam.
      </p>
      <EditorTurmas
        inicial={edicoes}
        atualizadoEm={atualizadoEm}
        hoje={hojeSaoPaulo()}
        exames={data.exames.map((e) => ({ id: e.id, nome: e.nome }))}
      />
    </div>
  )
}
