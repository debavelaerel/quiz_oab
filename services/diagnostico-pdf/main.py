"""Serviço de geração do diagnóstico em PDF. FastAPI fino em volta do pacote `diagnosis/` da
referência (vendor/pkg, copiado por scripts/sync-oab.mjs e nunca editado). Só usa
answers.from_code, report.build_html e logic.recomendar; o PDF vem do Chromium (render.py). Sem Node."""
import logging
import os
import re
import secrets
import sys
from contextlib import asynccontextmanager
from pathlib import Path

SERVICO = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICO / "vendor" / "pkg"))

import render  # noqa: E402
import s3  # noqa: E402
from diagnosis import logic as L  # noqa: E402
from diagnosis import report  # noqa: E402
from diagnosis.answers import LeadInvalido, from_code  # noqa: E402
from fastapi import Depends, FastAPI, Header, HTTPException  # noqa: E402
from fastapi.responses import HTMLResponse, JSONResponse, Response  # noqa: E402
from pydantic import BaseModel  # noqa: E402

logger = logging.getLogger("diagnostico-pdf")
DATA_HASH = (SERVICO / "vendor" / "data.sha256").read_text().strip()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await render.iniciar()
    yield
    await render.encerrar()


app = FastAPI(title="diagnostico-pdf", lifespan=lifespan)


class Recomendacao(BaseModel):
    tipo: str
    exame: str | None = None
    turma: int | None = None


class DiagnosticoRequest(BaseModel):
    codigo: str
    nome: str = ""
    diagnostico_token: str
    data_hash: str
    recomendacao: Recomendacao


def verificar_segredo(x_diagnostico_secret: str | None = Header(default=None)) -> None:
    esperado = os.environ.get("DIAGNOSTICO_SERVICE_SECRET", "")
    # Falha fechada: sem segredo configurado, recusa tudo.
    if not esperado or not x_diagnostico_secret or not secrets.compare_digest(
        x_diagnostico_secret.encode(), esperado.encode()
    ):
        raise HTTPException(status_code=401, detail="não autorizado")


def _chave_recomendacao(rec: dict) -> tuple:
    # `logic.recomendar` devolve um dict: {"tipo"} (f2/sem_prova), {"tipo","quando"} (cedo),
    # {"tipo","exame"} (sem_turma) ou {"tipo","exame","turma"} (ok/acima). exame é str ("48"),
    # turma é int (dias). O app manda null para o que não existe — .get() dá None igual.
    return (rec.get("tipo"), rec.get("exame"), rec.get("turma"))


@app.get("/health")
def health():
    # Sem autenticação (health check do balanceador). 503 com o Chromium caído: o
    # orquestrador vê o serviço doente; a próxima requisição de PDF relança o browser.
    if not render.conectado():
        return JSONResponse(status_code=503, content={"ok": False, "browser": "desconectado"})
    return {"ok": True}


def _validar(req: DiagnosticoRequest) -> tuple[dict, str]:
    """Hash do data.json, código QO1 e recomendação: as mesmas checagens para o PDF e para o HTML."""
    if req.data_hash != DATA_HASH:
        raise HTTPException(status_code=409, detail="data.json divergente entre o app e o serviço")
    try:
        A, hoje = from_code(req.codigo)
    except LeadInvalido as e:
        raise HTTPException(status_code=422, detail=str(e))
    pedido = (req.recomendacao.tipo, req.recomendacao.exame, req.recomendacao.turma)
    if _chave_recomendacao(L.recomendar(A, hoje)) != pedido:
        raise HTTPException(status_code=409, detail="recomendação do serviço difere da gravada pelo app")
    return A, hoje


@app.post("/diagnostico/html")
async def diagnostico_html(req: DiagnosticoRequest, _auth: None = Depends(verificar_segredo)) -> HTMLResponse:
    """O mesmo HTML que vira PDF, para o admin exibir o diagnóstico formatado (sem Chromium, sem S3)."""
    A, hoje = _validar(req)
    return HTMLResponse(report.build_html(A, hoje, req.nome))


@app.post("/diagnostico")
async def gerar_diagnostico(req: DiagnosticoRequest, _auth: None = Depends(verificar_segredo)) -> Response:
    A, hoje = _validar(req)

    headers: dict[str, str] = {}
    chave = None
    if s3.configurado():
        # Validado antes de gastar um render: o token vira parte da chave no bucket.
        if not re.fullmatch(r"[A-Za-z0-9-]{1,64}", req.diagnostico_token):
            raise HTTPException(status_code=422, detail="diagnostico_token inválido")
        chave = f"diagnosticos/{req.diagnostico_token}.pdf"

    html = report.build_html(A, hoje, req.nome)
    try:
        pdf = await render.html_para_pdf(html)
    except TimeoutError:
        logger.error("render do PDF estourou o tempo")
        raise HTTPException(status_code=504, detail="tempo esgotado ao gerar o PDF")

    if chave is not None:
        try:
            headers["X-Diagnostico-S3-Key"] = await s3.upload_pdf(chave, pdf)
        except Exception:
            logger.exception("falha no upload para o S3")
            raise HTTPException(status_code=502, detail="falha ao subir o PDF")
    return Response(content=pdf, media_type="application/pdf", headers=headers)
