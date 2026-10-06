#!/usr/bin/env node
// Gera app/(quiz)/fonts.css e app/(quiz)/quiz.css a partir do quiz original
// (reference/qual-a-oab-dev/_build/index.src.html + build.py > fonts_css()).
//
//   node scripts/gen-quiz-css.mjs
//
// Transformações (mecânicas, nenhuma regra visual muda):
//  - fonts.css: as mesmas @font-face de build.py, com URLs públicas (/fonts/...).
//  - quiz.css: o <style> do original sem {{FONTS}}, com cada seletor escopado em
//    `.qz` (a <div> raiz do grupo (quiz)): `:root`, `html` e `body` viram `.qz`,
//    `*` vira `.qz *`, o resto ganha o prefixo `.qz `. Assim nada vaza pro /admin.
//    URLs `assets/` viram `/brand/`. O @keyframes `in` vira `qz-in`.
//  - No topo, um bloco em @layer base que desfaz, só dentro do quiz, o que o
//    preflight do Tailwind (importado no layout raiz) muda em relação ao navegador
//    padrão em que o original foi desenhado. Fica na camada base: perde pra
//    qualquer regra do original (sem camada), ganha do preflight.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'reference/qual-a-oab-dev/_build/index.src.html')
const OUT = path.join(ROOT, 'app/(quiz)')

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT = 'U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF'
const AVISO = '/* GERADO por scripts/gen-quiz-css.mjs a partir de reference/qual-a-oab-dev. Não editar à mão. */'

function fontsCss() {
  const css = ["@font-face{font-family:'Degular';font-weight:900;src:url('/fonts/DegularDemo-Black.otf') format('opentype')}"]
  for (const w of [400, 500, 600, 700, 800]) {
    for (const [sub, rng] of [['latin', LATIN], ['latin-ext', LATIN_EXT]]) {
      css.push(`@font-face{font-family:'Poppins';font-weight:${w};font-display:swap;src:url('/fonts/Poppins-${w}-${sub}.woff2') format('woff2');unicode-range:${rng}}`)
    }
  }
  return css.join('\n')
}

function escopo(sel) {
  const s = sel.trim()
  if (s === ':root' || s === 'html' || s === 'body') return '.qz'
  if (s === '*') return '.qz *'
  return `.qz ${s}`
}

function transformar(css) {
  const out = []
  let i = 0
  while (i < css.length) {
    const abre = css.indexOf('{', i)
    if (abre < 0) { out.push(css.slice(i)); break }
    const cabeca = css.slice(i, abre)
    // acha a chave que fecha (com aninhamento, pro @keyframes)
    let prof = 0, j = abre
    for (; j < css.length; j++) {
      if (css[j] === '{') prof++
      else if (css[j] === '}' && --prof === 0) break
    }
    const corpo = css.slice(abre, j + 1)
    const lead = cabeca.match(/^\s*(\/\*[\s\S]*?\*\/\s*)*/)[0] // comentários antes do seletor
    const sel = cabeca.slice(lead.length)
    if (sel.trim().startsWith('@keyframes')) {
      out.push(lead + sel.replace(/@keyframes\s+in\b/, '@keyframes qz-in') + corpo)
    } else {
      const sels = [...new Set(sel.split(',').map(escopo))]
      out.push(lead + sels.join(',') + corpo)
    }
    i = j + 1
  }
  return out.join('')
}

const COMPAT = `@layer base{
  html:has(.qz){background:#faf7fd}
  .qz{line-height:normal}
  .qz p{margin-block:1em}
  .qz button{padding:1px 6px}
  .qz a{text-decoration:underline}
  .qz :is(h1,h2,h3,h4){font-weight:bold}
}`

function quizCss() {
  const src = readFileSync(SRC, 'utf8')
  const m = src.match(/<style>\n([\s\S]*?)<\/style>/)
  if (!m) throw new Error('<style> não encontrado')
  let css = m[1].replace('{{FONTS}}\n', '')
  if (css.includes('{{')) throw new Error('placeholder sobrando')
  css = css.replaceAll("url('assets/", "url('/brand/").replace('animation:in ', 'animation:qz-in ')
  if (css.includes('assets/')) throw new Error('URL assets/ sobrando')
  css = css.replace(/^\.back[^\n]*\n/gm, '') // o "Voltar" agora é o .voltar (form.css)
  return `${AVISO}\n${COMPAT}\n${transformar(css)}`
}

writeFileSync(path.join(OUT, 'fonts.css'), `${AVISO}\n${fontsCss()}\n`)
writeFileSync(path.join(OUT, 'quiz.css'), quizCss())
console.log('fonts.css e quiz.css gerados em app/(quiz)/')
