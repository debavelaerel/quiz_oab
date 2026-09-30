// HTML autocontido -> PDF A4. Chamado por diagnosis/pdf.py.
// O Playwright mora em platform/node_modules, e o import de um .mjs resolve
// pela pasta do próprio script, então ele é carregado pelo caminho recebido.
import { createRequire } from 'node:module';

const [entrada, saida, base] = process.argv.slice(2);
const require = createRequire(base.endsWith('/') ? base : base + '/');
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + entrada, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
// Margens e rodapé com numeração ficam aqui; o CSS do laudo não define @page
// margin de propósito, senão ele ganha da API e invade a faixa do rodapé.
await page.pdf({
  path: saida,
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '14mm', left: '0', right: '0' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%;padding:0 15mm;font-family:system-ui,sans-serif;
      font-size:7.5pt;color:#8d7f9b;display:flex;justify-content:space-between">
      <span>Qual a OAB da sua aprovação em 2027? · Método VDE</span>
      <span class="pageNumber"></span>
    </div>`,
});
await browser.close();
