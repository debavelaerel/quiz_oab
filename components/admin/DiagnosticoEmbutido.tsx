import { Alerta, Cartao } from './ui'

/**
 * O diagnóstico completo, idêntico ao PDF (o HTML vem do serviço de PDF, a partir do pacote do VDE).
 * `sandbox=""` bloqueia script, formulário e navegação: o conteúdo é só para leitura.
 */
export default function DiagnosticoEmbutido({ html, erro }: { html?: string; erro?: string }) {
  return (
    <Cartao titulo="Diagnóstico completo" className="mt-4">
      <p className="mb-3 text-[12.5px] text-brand-ink-soft">Mesmo conteúdo do PDF que o lead recebe.</p>
      {html ? (
        <iframe
          title="Diagnóstico completo"
          sandbox=""
          srcDoc={html}
          className="h-[85vh] min-h-[720px] w-full rounded-xl border border-brand-line bg-white"
        />
      ) : (
        <Alerta tom="erro">Não foi possível carregar o diagnóstico: {erro ?? 'serviço indisponível'}. O resto da página segue funcionando.</Alerta>
      )}
    </Cartao>
  )
}
