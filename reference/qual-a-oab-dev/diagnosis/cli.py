"""Linha de comando do laudo.

O consultor cola a mensagem que o lead mandou no WhatsApp e recebe o PDF:

    python3 -m diagnosis "Oi! Fiz o quiz ... QO1.cursando.sem.8.dia.-.-.b1.-.zero.h3.estagio.insta.20260929" --nome "Maria"

Opções: -o pasta ou arquivo de saída (padrão: laudos/), --html pra gerar só o HTML.
"""
import argparse
import pathlib
import re
import sys
import unicodedata

from . import logic as L
from . import pdf as pdf_mod
from .answers import LeadInvalido, from_code
from .report import build_html


def slug(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower() or "lead"


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python3 -m diagnosis", description="Gera o diagnóstico em PDF a partir do código QO1 do WhatsApp.")
    ap.add_argument("codigo", help="a mensagem do WhatsApp (ou só o código QO1....)")
    ap.add_argument("--nome", default="", help="primeiro nome do lead, pra personalizar")
    ap.add_argument("-o", "--saida", default="laudos", help="pasta ou arquivo .pdf/.html")
    ap.add_argument("--html", action="store_true", help="gera só o HTML, sem PDF")
    ap.add_argument("--hoje", help="data de referência (AAAA-MM-DD); padrão: a data do código")
    a = ap.parse_args(argv)
    try:
        A, data = from_code(a.codigo)
    except LeadInvalido as err:
        print(f"Código inválido: {err}", file=sys.stderr)
        return 2
    hoje = a.hoje or data
    rec = L.recomendar(A, hoje)
    try:
        html = build_html(A, hoje, a.nome)
    except ValueError as err:
        print(str(err), file=sys.stderr)
        return 3
    destino = pathlib.Path(a.saida)
    ext = "html" if a.html else "pdf"
    if destino.suffix.lower() not in (".pdf", ".html"):
        destino.mkdir(parents=True, exist_ok=True)
        destino = destino / f"oab-{rec['exame']}-{slug(a.nome)}-{hoje}.{ext}"
    if destino.suffix.lower() == ".html":
        destino.write_text(html, encoding="utf-8")
    else:
        pdf_mod.html_to_pdf(html, destino)
    anual = " · perfil pra turma ANUAL" if L.oferece_anual(A, rec) else ""
    print(f"{destino}  ·  OAB {rec['exame']} · turma {rec.get('turma') or '-'} · {rec['tipo']}{anual}")
    return 0
