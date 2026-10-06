"""HTML -> PDF via Playwright, direto em Python — sem Node.

Copiado do molde (serviço de PDF do quiz Tribunais)
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
# Se o Chromium cair (OOM, "Target crashed", processo morto), o browser
# compartilhado fica desconectado e toda requisição seguinte falharia até o
# contêiner reiniciar. Em vez disso, a próxima requisição relança o browser. O
# lock garante que uma rajada de requisições sobre um browser morto relance UM
# Chromium, não um por requisição.
_lock_browser = asyncio.Lock()

# Tempo máximo de cada operação do Playwright na página (set_content, e — via
# set_default_timeout — o resto) e teto da renderização inteira. page.pdf() não
# aceita timeout próprio; o asyncio.wait_for cobre ele também. Sem isso, uma
# página travada seguraria para sempre uma das 2 vagas do semáforo.
TIMEOUT_MS = 30_000
TIMEOUT_TOTAL_S = 40


def conectado() -> bool:
    return _browser is not None and _browser.is_connected()


async def _lancar() -> None:
    global _playwright, _browser
    if _playwright is None:
        _playwright = await async_playwright().start()
    # --disable-dev-shm-usage: o /dev/shm padrão de um contêiner Docker tem só
    # 64MB, pouco pro Chromium — sem a flag ele grava a memória compartilhada lá
    # e cai ("Target crashed") em páginas maiores. Com ela usa /tmp.
    _browser = await _playwright.chromium.launch(
        headless=True, args=["--disable-dev-shm-usage"], timeout=TIMEOUT_MS
    )


async def _garantir_browser():
    """Devolve o browser compartilhado, relançando-o se caiu (ou nunca subiu)."""
    global _browser
    if conectado():
        return _browser
    async with _lock_browser:
        if not conectado():  # outra requisição pode ter relançado enquanto esperávamos o lock
            antigo, _browser = _browser, None
            if antigo is not None:
                try:
                    await antigo.close()
                except Exception:
                    pass  # já morto; só liberando o que der
            await _lancar()
    return _browser


async def iniciar() -> None:
    await _garantir_browser()


async def encerrar() -> None:
    global _playwright, _browser
    if _browser is not None:
        try:
            await _browser.close()
        except Exception:
            pass
        _browser = None
    if _playwright is not None:
        await _playwright.stop()
        _playwright = None


async def _renderizar(browser, html: str) -> bytes:
    ctx = await browser.new_context()
    try:
        page = await ctx.new_page()
        page.set_default_timeout(TIMEOUT_MS)
        # O HTML do diagnóstico é autocontido (fontes e imagens em data: URI),
        # então set_content equivale ao page.goto('file://…') da referência.
        await page.set_content(html, wait_until="networkidle", timeout=TIMEOUT_MS)
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
        # Roda também quando o wait_for cancela por tempo: fecha página e contexto.
        try:
            await asyncio.wait_for(ctx.close(), 5)
        except Exception:
            pass


async def html_para_pdf(html: str) -> bytes:
    """Gera o PDF. Levanta TimeoutError se passar de TIMEOUT_TOTAL_S."""
    async with _semaforo:
        browser = await _garantir_browser()
        return await asyncio.wait_for(_renderizar(browser, html), TIMEOUT_TOTAL_S)
