"""Lead answers: parsed from the code at the end of the WhatsApp message.

QO1.<situacao>.<regime>.<periodo>.<grade>.<tentativa>.<pontos>.<nivel>.<inscrito>.<metodo>.<horas>.<trabalho>.<vde>.<rotina>.<AAAAMMDD>
Multiple answers (rotina) are joined with "+".
Field order lives in data.json ("campos"); '-' means the question was not shown.
"""
import re

from .data import DATA, P

PREFIXO = DATA["prefixo"]
CAMPOS = DATA["campos"]


class LeadInvalido(ValueError):
    pass


def from_code(texto):
    m = re.search(re.escape(PREFIXO) + r"\.([A-Za-z0-9.+\-]+)", texto or "")
    if not m:
        raise LeadInvalido(f"não achei um código {PREFIXO}. na mensagem")
    partes = m.group(1).strip(".").split(".")
    if len(partes) != len(CAMPOS) + 1:
        raise LeadInvalido(f"o código tem {len(partes)} partes, esperava {len(CAMPOS) + 1}")
    A = {c: v for c, v in zip(CAMPOS, partes) if v != "-"}
    d = partes[-1]
    if not re.fullmatch(r"\d{8}", d):
        raise LeadInvalido(f"data inválida no código: {d}")
    t = A.pop("teste", None)
    if t is not None:
        if not re.fullmatch(r"[ABCDX]{%d}" % len(DATA["teste"]), t):
            raise LeadInvalido(f"respostas do teste inválidas: {t}")
        A["teste"] = t
    for c, v in A.items():
        if c == "teste":
            continue
        validos = [o[0] for o in P[c]["opcoes"]]
        for item in (v.split("+") if P[c].get("multi") else [v]):
            if item not in validos:
                raise LeadInvalido(f"'{item}' não é resposta válida de '{c}'")
    return A, f"{d[:4]}-{d[4:6]}-{d[6:]}"


def label(A, campo):
    v = A.get(campo)
    if v is None or campo == "teste":
        return None
    if campo == "periodo":
        return f"{v}º ano" if A.get("regime") == "ano" else f"{v}º período"
    if campo == "metodo" and A.get("tentativa") == "reprov" and v in P["metodo"].get("rotulosReprov", {}):
        return P["metodo"]["rotulosReprov"][v]
    rotulos = {o[0]: o[1] for o in P[campo]["opcoes"]}
    if P[campo].get("multi"):
        itens = [rotulos.get(x, x) for x in v.split("+")]
        return ", ".join([itens[0]] + [i[0].lower() + i[1:] for i in itens[1:]])
    return rotulos.get(v, v)
