/**
 * Trava de avanço de tela: no máximo um avanço por tela (clique duplo não empilha a próxima tela
 * duas vezes) e o avanço adiado (os 160 ms da escolha única) pode ser cancelado pelo "voltar".
 */
export class Avanco {
  private timer: ReturnType<typeof setTimeout> | null = null
  private travado = false

  /** Agenda (ms > 0) ou roda na hora (ms = 0). Devolve false se já há um avanço nesta tela. */
  agendar(fn: () => void, ms = 0): boolean {
    if (this.travado) return false
    this.travado = true
    if (ms > 0) this.timer = setTimeout(() => { this.timer = null; fn() }, ms)
    else fn()
    return true
  }

  /** "Voltar" ou desmontagem: descarta o avanço pendente e destrava. */
  cancelar(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.travado = false
  }

  /** Uma tela nova abriu: pode avançar de novo. */
  liberar(): void {
    this.travado = false
  }

  /** Nenhum avanço feito nem agendado nesta tela. */
  get livre(): boolean {
    return !this.travado
  }

  get pendente(): boolean {
    return this.timer !== null
  }
}
