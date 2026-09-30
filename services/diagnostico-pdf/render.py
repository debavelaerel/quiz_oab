"""HTML -> PDF via Playwright, direto em Python — sem Node.

Copiado do molde (reference/tribunais-patterns/services/diagnostico-pdf/render.py)
e adaptado a este pacote. O `pdf.py` do pacote `diagnosis` delega pra um
script Node (`_build/html2pdf.mjs`); em vez de subir um segundo runtime só
pra isso, geramos o PDF daqui — mesmo motor (Chromium headless) e as mesmas
opções de página do html2pdf.mjs da referência (A4, mídia print, margens
14mm em cima/embaixo e 0 nas laterais, rodapé com numeração), para o PDF
sair igual aos de reference/qual-a-oab-dev/exemplos/*.pdf.

API assíncrona do Playwright, não a síncrona: a síncrona é presa à thread
do SO em que foi iniciada (usa greenlets por baixo) — funciona em um script
simples de ponta a ponta numa única thread, mas quebra num servidor web,
onde cada requisição pode cair numa thread diferente do pool
(`greenlet.error: cannot switch to a different thread`). A API assíncrona
roda inteira no event loop único do FastAPI, sem esse problema de afinidade
de thread.
"""
import asyncio

from playwright.async_api import async_playwright

# Rodapé com numeração de página em toda página — o mesmo do html2pdf.mjs da
# referência. Não dá pra fazer isso só com CSS: header/footer de PDF do
# Chromium são um recurso à parte da chamada de impressão, renderizado fora
# do documento — por isso não herda a fonte embutida no <style> do corpo.
# O CSS do diagnóstico não define margem de @page de propósito, senão ela
# ganha da API e invade a faixa do rodapé.
FOOTER_TEMPLATE = """<div style="width:100%;padding:0 15mm;font-family:system-ui,sans-serif;
      font-size:7.5pt;color:#8d7f9b;display:flex;justify-content:space-between">
      <span>Qual a OAB da sua aprovação em 2027? · Método VDE</span>
      <span class="pageNumber"></span>
    </div>"""

# Um Chromium por processo, não um por requisição: abrir um browser novo a
# cada chamada sobe um driver + um Chromium inteiro por requisição — sob
# qualquer rajada de tráfego isso derruba uma instância pequena por memória.
# Um único browser vive pelo processo inteiro (aberto em `iniciar()`, no
# lifespan do FastAPI — ver main.py); páginas concorrentes sobre o mesmo
# browser são seguras na API assíncrona. O semáforo não é sobre correção, é
# sobre não deixar muitas requisições simultâneas abrirem muitas páginas ao
# mesmo tempo num contêiner pequeno.
_playwright = None
_browser = None
_semaforo = asyncio.Semaphore(2)


async def iniciar() -> None:
    global _playwright, _browser
    if _browser is not None:
        return
    _playwright = await async_playwright().start()
    _browser = await _playwright.chromium.launch(headless=True)


async def encerrar() -> None:
    global _playwright, _browser
    if _browser is not None:
        await _browser.close()
        _browser = None
    if _playwright is not None:
        await _playwright.stop()
        _playwright = None


async def html_para_pdf(html: str) -> bytes:
    if _browser is None:
        raise RuntimeError("render.iniciar() precisa rodar antes de html_para_pdf() — chamado fora do lifespan do FastAPI?")
    async with _semaforo:
        page = await _browser.new_page()
        try:
            # O HTML do diagnóstico é autocontido (fontes e imagens em data: URI),
            # então set_content equivale ao page.goto('file://…') da referência.
            await page.set_content(html, wait_until="networkidle")
            await page.emulate_media(media="print")
            return await page.pdf(
                format="A4",
                print_background=True,
                display_header_footer=True,
                header_template="<div></div>",
                footer_template=FOOTER_TEMPLATE,
                margin={"top": "14mm", "bottom": "14mm", "left": "0", "right": "0"},
            )
        finally:
            await page.close()
