# DESIGN.md — Quiz OAB (Método VDE)

<!-- meta
source: CSS do quiz original (reference/qual-a-oab-dev/_build/index.src.html, convertido em app/(quiz)/quiz.css)
        + regras de disciplina do DESIGN.md do quiz Tribunais (reference/tribunais-patterns/DESIGN.md)
last-reviewed: 2026-10-02
-->

> Fonte da verdade do design do Quiz OAB. Toda tela nova (quiz ou painel `/admin`) usa os tokens abaixo —
> sem cor, raio ou sombra soltos. O CSS do **quiz** (`app/(quiz)/quiz.css`) é gerado do original do VDE e não
> é editado à mão; o **admin** usa os mesmos valores como tokens do Tailwind em `app/globals.css`
> (`@theme`, prefixo `brand-`). A seção 8 replica os valores em JSON.

## 1. Identity

**Poppins** (400/500/600/700) é a única fonte de texto; **Degular** só nos números grandes do quiz
(`.num`). Marca: **roxo profundo + amarelo**, em fundo claro lilás. O logotipo (`public/brand/logo-*.png`)
nunca muda de cor nem de proporção (branco sobre o roxo escuro, colorido sobre o claro).

Disciplina herdada do design system do Tribunais (vale aqui): poucas cores, formas com poucos raios, **cards
sem sombra** (só borda), sombra apenas em elemento acionável, e **nenhum valor fora das tabelas abaixo**
sem atualizar este arquivo antes.

## 2. Color

| Token | Hex | Uso |
|---|---|---|
| `brand-bg` | `#FAF7FD` | Fundo de toda tela |
| `brand-card` | `#FFFFFF` | Cartões, tabelas, campos — separados do fundo só por borda |
| `brand-ink` | `#2D2733` | Texto primário |
| `brand-ink-soft` | `#4F4F4F` | Texto de apoio, cabeçalho de tabela |
| `brand-ink-dim` | `#8D7F9B` | Metadados, placeholders (nunca texto essencial: contraste baixo) |
| `brand-line` | `#E7D8F6` | Borda padrão de cartões e campos |
| `brand-line-strong` | `#C9A0EE` | Borda em hover e botão de contorno |
| `brand-tint` | `#F5EEFC` | Tinta clara do roxo: linha em hover, chip, opção selecionada |
| `brand-roxo` | `#5A009F` | Cor de marca: títulos de bloco, links, foco, botão neutro |
| `brand-roxo-2` | `#3B0069` | Roxo profundo: barra de topo, texto sobre o amarelo, hover do roxo |
| `brand-yel` | `#F5C518` | Amarelo: botão primário, selo (pill), preenchimento da barra |
| `brand-yel-tint` | `#FFF6D1` | Fundo de aviso e de "pendente" |
| `brand-yel-text` | `#7A5C00` | Texto sobre `brand-yel-tint` |
| `brand-green` / `brand-green-tint` | `#1F9D63` / `#E6F6EE` | **Função**: pronto, sucesso |
| `brand-red` / `brand-red-tint` | `#B42318` / `#FDECEA` | **Função**: erro, alerta |

Verde e vermelho são função (estado), nunca decoração. Fora disso, só tintas do roxo e do amarelo.

## 3. Typography (Poppins)

| Papel | Tamanho | Peso | Onde |
|---|---|---|---|
| h1 tela | 24px | 700 | Título de página (`letter-spacing: -0.01em`) |
| h2 bloco | 16.5px | 700 | Título de cartão, em `brand-roxo` |
| body | 14.5px | 400 | Tabelas, listas, parágrafos do painel |
| label / botão | 14.5px | 500–600 | Rótulo de campo, texto de botão |
| caption | 12.5–13px | 500/600 | Metadados, cabeçalho de tabela, legendas |
| selo (pill) | 12px | 600 | Selo amarelo antes do título |

No celular, **campos de formulário usam 16px** (o iOS dá zoom em campos menores).

## 4. Radius (escala fechada)

- **pill** (`rounded-full`): selos, chips, badges de estado, trilho da barra de progresso.
- **16px**: botões e cartões de opção; alerta (aviso/erro).
- **14px**: cartão de informação (bloco, tabela, filtros).
- **12px**: campo de formulário (borda 1px, padding 12/14px).
- **20px**: bloco grande do quiz (resultado, "próximos passos"). Não usado no admin.

## 5. Shadow (só em elemento acionável)

- **botão amarelo (primário)**: `0 8px 20px rgba(245,197,24,.35)`; hover `0 12px 26px rgba(245,197,24,.40)` + `-translate-y-px`.
- **botão roxo (neutro)**: `0 8px 20px rgba(90,0,159,.28)`; hover `0 12px 26px rgba(90,0,159,.32)` + `-translate-y-px`.
- Botão de contorno e botão fantasma: **sem sombra**.
- **Cards, tabelas e filtros não têm sombra** — só a borda `brand-line`.
- Sombras sempre tingidas da cor da marca, nunca cinza puro.

## 6. States

- **Hover**: botão sobe 1px e a sombra aprofunda; linha de tabela vira `brand-tint`; link de contorno vai a `brand-line-strong`.
- **Foco** (campo): borda `brand-roxo` + anel de 3px `rgba(90,0,159,.08)`. **Foco por teclado** (botão/link):
  anel de 3px `rgba(90,0,159,.25)` (`focus-visible`).
- **Disabled**: `opacity-45`, sem sombra e sem deslocamento.
- **Erro**: alerta `brand-red-tint` com borda `brand-red/30` e `role="alert"`; campo inválido com borda `brand-red`.

## 7. Rules

**Do**
- Reusar os componentes do admin em `components/admin/ui.tsx` (botões, campo, cartão, badge, alerta) —
  nunca repetir o markup nem as classes numa página nova.
- Puxar cor só dos tokens `brand-*`. Hex novo entra primeiro neste arquivo e em `app/globals.css`.
- Texto visível ao usuário é copy de produto, nunca nome de variável ou instrução de dev.
- Um botão **primário** (amarelo) por tela; ações secundárias em contorno.

**Don't**
- Não inventar raio, sombra ou cor fora das seções 2, 4 e 5.
- Não pôr sombra em cartão, tabela ou filtro.
- Não usar cinza azulado do Tailwind (`slate-*`, `gray-*`) nem outra fonte.
- Não alterar as cores nem a proporção do logotipo.

## 8. Machine-readable tokens

```json design-tokens
{
  "$schema": "design-tokens.v1",
  "meta": { "source": "app/globals.css + app/(quiz)/quiz.css", "generated": "2026-10-02" },
  "color": {
    "brand-bg": "#FAF7FD", "brand-card": "#FFFFFF",
    "brand-ink": "#2D2733", "brand-ink-soft": "#4F4F4F", "brand-ink-dim": "#8D7F9B",
    "brand-line": "#E7D8F6", "brand-line-strong": "#C9A0EE", "brand-tint": "#F5EEFC",
    "brand-roxo": "#5A009F", "brand-roxo-2": "#3B0069",
    "brand-yel": "#F5C518", "brand-yel-tint": "#FFF6D1", "brand-yel-text": "#7A5C00",
    "brand-green": "#1F9D63", "brand-green-tint": "#E6F6EE",
    "brand-red": "#B42318", "brand-red-tint": "#FDECEA"
  },
  "radius": { "pill": "9999px", "button": "16px", "card": "14px", "field": "12px", "block": "20px" },
  "shadow": {
    "button-yel": "0 8px 20px rgba(245,197,24,.35)",
    "button-roxo": "0 8px 20px rgba(90,0,159,.28)"
  },
  "typography": {
    "font": "Poppins",
    "h1": { "size": 24, "weight": 700 }, "h2": { "size": 16.5, "weight": 700 },
    "body": { "size": 14.5, "weight": 400 }, "caption": { "size": 12.5, "weight": 500 }
  }
}
```
