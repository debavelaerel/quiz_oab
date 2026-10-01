"""Recuperação do Chromium e timeouts do render — com browser falso (sem Chromium real)."""
import asyncio

import pytest

import render


class FakePage:
    def __init__(self, travar: bool):
        self.travar = travar
        self.timeouts: dict[str, float | None] = {}

    def set_default_timeout(self, ms: float) -> None:
        self.timeouts["default"] = ms

    async def set_content(self, html: str, *, wait_until=None, timeout=None) -> None:
        self.timeouts["set_content"] = timeout
        if self.travar:
            await asyncio.sleep(3600)

    async def emulate_media(self, **_kw) -> None:
        return None

    async def pdf(self, **_kw) -> bytes:
        return b"%PDF-fake"


class FakeContext:
    def __init__(self, browser: "FakeBrowser"):
        self.browser = browser
        self.fechado = False

    async def new_page(self) -> FakePage:
        p = FakePage(self.browser.travar)
        self.browser.paginas.append(p)
        return p

    async def close(self) -> None:
        self.fechado = True


class FakeBrowser:
    def __init__(self):
        self.conectado = True
        self.travar = False
        self.contextos: list[FakeContext] = []
        self.paginas: list[FakePage] = []

    def is_connected(self) -> bool:
        return self.conectado

    async def new_context(self) -> FakeContext:
        c = FakeContext(self)
        self.contextos.append(c)
        return c

    async def close(self) -> None:
        self.conectado = False


class FakeChromium:
    def __init__(self):
        self.lancados: list[FakeBrowser] = []
        self.args: list[list[str]] = []

    async def launch(self, *, headless=True, args=(), timeout=None) -> FakeBrowser:
        await asyncio.sleep(0)  # cede o loop: chamadas concorrentes se cruzam aqui
        self.args.append(list(args))
        b = FakeBrowser()
        self.lancados.append(b)
        return b


class FakePlaywright:
    def __init__(self):
        self.chromium = FakeChromium()

    async def stop(self) -> None:
        return None


@pytest.fixture
def pw(monkeypatch):
    fake = FakePlaywright()
    monkeypatch.setattr(render, "_playwright", fake)
    monkeypatch.setattr(render, "_browser", None)
    # Primitivas novas por teste: cada teste roda num event loop próprio.
    monkeypatch.setattr(render, "_semaforo", asyncio.Semaphore(2))
    monkeypatch.setattr(render, "_lock_browser", asyncio.Lock())
    return fake


async def test_relanca_o_browser_depois_de_desconectar(pw):
    await render.iniciar()
    assert len(pw.chromium.lancados) == 1
    assert render.conectado()
    pw.chromium.lancados[0].conectado = False  # Chromium caiu
    assert not render.conectado()
    assert await render.html_para_pdf("<p>x</p>") == b"%PDF-fake"
    assert len(pw.chromium.lancados) == 2
    assert render.conectado()
    assert all("--disable-dev-shm-usage" in a for a in pw.chromium.args)


async def test_chamadas_concorrentes_relancam_uma_vez_so(pw):
    await render.iniciar()
    pw.chromium.lancados[0].conectado = False
    r = await asyncio.gather(*(render.html_para_pdf("<p>x</p>") for _ in range(5)))
    assert r == [b"%PDF-fake"] * 5
    assert len(pw.chromium.lancados) == 2


async def test_passa_timeouts_explicitos_e_fecha_o_contexto(pw):
    await render.iniciar()
    await render.html_para_pdf("<p>x</p>")
    b = pw.chromium.lancados[0]
    assert b.paginas[0].timeouts == {"default": render.TIMEOUT_MS, "set_content": render.TIMEOUT_MS}
    assert all(c.fechado for c in b.contextos)


async def test_timeout_libera_a_vaga_do_semaforo(pw, monkeypatch):
    monkeypatch.setattr(render, "TIMEOUT_TOTAL_S", 0.05)
    await render.iniciar()
    b = pw.chromium.lancados[0]
    b.travar = True
    # Mais chamadas travadas que vagas no semáforo: se a vaga não fosse liberada,
    # a terceira esperaria para sempre em vez de também estourar o tempo.
    for _ in range(3):
        with pytest.raises(asyncio.TimeoutError):
            await render.html_para_pdf("<p>x</p>")
    assert all(c.fechado for c in b.contextos)
    b.travar = False
    assert await asyncio.wait_for(render.html_para_pdf("<p>x</p>"), 1) == b"%PDF-fake"
