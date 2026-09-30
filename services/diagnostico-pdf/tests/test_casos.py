import pytest
from conftest import CASOS, REF

from diagnosis import logic as L
from diagnosis import report
from diagnosis.answers import from_code

COM_DIAGNOSTICO = [c for c in CASOS if c["esperado"]["recebe_laudo"]]


def test_80_casos_recebem_diagnostico():
    assert len(COM_DIAGNOSTICO) == 80


@pytest.mark.parametrize("caso", COM_DIAGNOSTICO, ids=lambda c: c["codigo"][:48])
def test_monta_html_sem_excecao(caso):
    A, hoje = from_code(caso["codigo"])
    html = report.build_html(A, hoje, caso.get("nome", ""))
    assert "<html" in html.lower()
    rec = L.recomendar(A, hoje)
    assert rec["tipo"] == caso["esperado"]["tipo"]


def test_exemplos_batem_byte_a_byte():
    com_nome = [c for c in CASOS if c.get("laudo_html")]
    assert len(com_nome) == 5
    for c in com_nome:
        A, hoje = from_code(c["codigo"])
        # `laudo_html` é relativo à raiz da referência (ex.: "exemplos/oab-48-maria-...html").
        # Bytes, não read_text(): read_text traduz \r\n e esconderia diferença de quebra de linha.
        esperado = (REF / c["laudo_html"]).read_bytes()
        assert report.build_html(A, hoje, c["nome"]).encode("utf-8") == esperado
