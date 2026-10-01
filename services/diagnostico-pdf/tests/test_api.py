import pytest
from conftest import CASOS, SERVICO
from fastapi.testclient import TestClient

import main

HASH = (SERVICO / "vendor" / "data.sha256").read_text().strip()
CASO_OK = next(c for c in CASOS if c["esperado"]["tipo"] == "ok")
CASO_SEM_TURMA = next(c for c in CASOS if c["esperado"]["tipo"] == "sem_turma")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("DIAGNOSTICO_SERVICE_SECRET", "seg")
    monkeypatch.delenv("BUCKET_NAME", raising=False)

    async def fake_pdf(html: str) -> bytes:
        return b"%PDF-fake"

    monkeypatch.setattr(main.render, "html_para_pdf", fake_pdf)

    async def noop() -> None:
        return None

    monkeypatch.setattr(main.render, "iniciar", noop)
    monkeypatch.setattr(main.render, "encerrar", noop)
    monkeypatch.setattr(main.render, "conectado", lambda: True)
    with TestClient(main.app) as c:
        yield c


def corpo(caso=CASO_OK, **over):
    e = caso["esperado"]
    base = {
        "codigo": caso["codigo"], "nome": "Maria", "diagnostico_token": "tok-1", "data_hash": HASH,
        "recomendacao": {"tipo": e["tipo"], "exame": e.get("exame"), "turma": e.get("turma")},
    }
    base.update(over)
    return base


H = {"X-Diagnostico-Secret": "seg"}


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_health_503_com_o_browser_desconectado(client, monkeypatch):
    monkeypatch.setattr(main.render, "conectado", lambda: False)
    r = client.get("/health")  # sem segredo: o health check do balanceador não autentica
    assert r.status_code == 503
    assert r.json() == {"ok": False, "browser": "desconectado"}


def test_504_quando_o_render_estoura_o_tempo(client, monkeypatch):
    async def trava(html: str) -> bytes:
        raise TimeoutError

    monkeypatch.setattr(main.render, "html_para_pdf", trava)
    assert client.post("/diagnostico", json=corpo(), headers=H).status_code == 504


def test_sem_segredo_401(client):
    assert client.post("/diagnostico", json=corpo()).status_code == 401
    assert client.post("/diagnostico", json=corpo(), headers={"X-Diagnostico-Secret": "errado"}).status_code == 401


def test_falha_fechada_sem_segredo_configurado(client, monkeypatch):
    monkeypatch.delenv("DIAGNOSTICO_SERVICE_SECRET")
    assert client.post("/diagnostico", json=corpo(), headers=H).status_code == 401
    # Nem o segredo vazio passa quando o servidor não tem segredo.
    assert client.post("/diagnostico", json=corpo(), headers={"X-Diagnostico-Secret": ""}).status_code == 401


def test_gera_pdf_sem_s3(client):
    r = client.post("/diagnostico", json=corpo(), headers=H)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert "X-Diagnostico-S3-Key" not in r.headers


def test_sem_turma_com_turma_nula(client):
    # Formato que o app manda para sem_turma: exame preenchido, turma null.
    r = client.post("/diagnostico", json=corpo(CASO_SEM_TURMA), headers=H)
    assert r.status_code == 200


def test_409_hash_divergente(client):
    assert client.post("/diagnostico", json=corpo(data_hash="0" * 64), headers=H).status_code == 409


def test_409_recomendacao_divergente(client):
    assert client.post("/diagnostico", json=corpo(recomendacao={"tipo": "ok", "exame": "99", "turma": 1}), headers=H).status_code == 409


def test_409_turma_divergente(client):
    e = CASO_OK["esperado"]
    rec = {"tipo": e["tipo"], "exame": e["exame"], "turma": e["turma"] + 1}
    assert client.post("/diagnostico", json=corpo(recomendacao=rec), headers=H).status_code == 409


def test_422_codigo_invalido(client):
    assert client.post("/diagnostico", json=corpo(codigo="lixo"), headers=H).status_code == 422


def test_sobe_para_o_s3_e_devolve_a_chave(client, monkeypatch):
    monkeypatch.setenv("BUCKET_NAME", "b")
    enviados = {}

    async def fake_upload(chave: str, pdf: bytes) -> str:
        enviados[chave] = pdf
        return chave

    monkeypatch.setattr(main.s3, "upload_pdf", fake_upload)
    r = client.post("/diagnostico", json=corpo(), headers=H)
    assert r.status_code == 200
    assert r.headers["X-Diagnostico-S3-Key"] == "diagnosticos/tok-1.pdf"
    assert enviados["diagnosticos/tok-1.pdf"] == b"%PDF-fake"


def test_422_token_invalido_com_s3(client, monkeypatch):
    monkeypatch.setenv("BUCKET_NAME", "b")
    assert client.post("/diagnostico", json=corpo(diagnostico_token="../x"), headers=H).status_code == 422


def test_502_quando_o_upload_falha(client, monkeypatch):
    monkeypatch.setenv("BUCKET_NAME", "b")

    async def quebra(chave: str, pdf: bytes) -> str:
        raise RuntimeError("s3 fora")

    monkeypatch.setattr(main.s3, "upload_pdf", quebra)
    assert client.post("/diagnostico", json=corpo(), headers=H).status_code == 502
