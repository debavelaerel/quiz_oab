/** Empurra um evento pro dataLayer (GTM). Analytics nunca quebra o quiz. */
export function track(ev: string, extra?: Record<string, unknown>): void {
  try {
    const w = window as unknown as { dataLayer?: unknown[] }
    ;(w.dataLayer = w.dataLayer || []).push({ event: ev, ...(extra ?? {}) })
  } catch { /* sem analytics */ }
}
