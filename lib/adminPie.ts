// Fatias do gráfico de pizza em SVG (sem biblioteca).
export type Fatia = { valor: string; path: string }

export function paraFatias(dados: { valor: string; contagem: number }[], raio: number): Fatia[] {
  const total = dados.reduce((soma, d) => soma + d.contagem, 0)
  if (total <= 0) return []
  const c = raio
  if (dados.length === 1) {
    return [{ valor: dados[0].valor, path: `M ${c} ${c - raio} A ${raio} ${raio} 0 1 1 ${c} ${c + raio} A ${raio} ${raio} 0 1 1 ${c} ${c - raio} Z` }]
  }
  let ang = -Math.PI / 2
  return dados.filter((d) => d.contagem > 0).map((d) => {
    const delta = (d.contagem / total) * Math.PI * 2
    const [x1, y1] = [c + raio * Math.cos(ang), c + raio * Math.sin(ang)]
    ang += delta
    const [x2, y2] = [c + raio * Math.cos(ang), c + raio * Math.sin(ang)]
    return { valor: d.valor, path: `M ${c} ${c} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${raio} ${raio} 0 ${delta > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z` }
  })
}
