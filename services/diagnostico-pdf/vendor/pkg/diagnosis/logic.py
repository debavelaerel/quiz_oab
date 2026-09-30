"""Python mirror of _build/logic.js. _build/check.py runs both and fails if they diverge."""
import datetime

from .data import DATA

R = DATA["regra"]


def day(s):
    return datetime.date.fromisoformat(s).toordinal()


def sem_idx(s):
    y, m = int(s[:4]), int(s[5:7])
    return y * 2 + (1 if m >= 7 else 0)


def sem_label(idx):
    return {"ano": idx // 2, "sem": idx % 2 + 1}


def year(s):
    return int(s[:4])


def nivel(A):
    if A.get("tentativa") == "reprov":
        return DATA["pontosNivel"].get(A.get("pontos"))
    return A.get("nivel")


def posicao_em(A, today, alvo):
    P = int(A["periodo"])
    if A.get("regime") == "ano":
        return P + (year(alvo) - year(today))
    return P + (sem_idx(alvo) - sem_idx(today))


def elegivel(A, ex, today):
    if A.get("situacao") == "formado":
        return True
    minimo = R["anoMinimo"] if A.get("regime") == "ano" else R["periodoMinimo"]
    return posicao_em(A, today, ex["corte"]) >= minimo


def futuros(today):
    return [ex for ex in DATA["exames"] if day(today) <= day(ex["fase1"])]


def exame_inscricao_fechada(A, today):
    for ex in futuros(today):
        if elegivel(A, ex, today) and day(today) > day(ex["inscFim"]):
            return ex
    return None


def status_exame(A, ex, today):
    if day(today) > day(ex["fase1"]):
        return "passou"
    if not elegivel(A, ex, today):
        return "nao_libera"
    if day(today) > day(ex["inscFim"]):
        return "ok" if A.get("inscrito") == "s" else "sem_inscricao"
    return "ok"


def status_turma(t, today):
    if day(today) > day(t["vendasFim"]):
        return "encerrada"
    if day(today) < day(t["vendasIni"]):
        return "breve"
    return "aberta"


def horas_turma(t):
    return DATA["rotinas"][str(t["dias"])]["horas"]


def turmas_do_exame(ex_id):
    return sorted((t for t in DATA["turmas"] if t["exame"] == ex_id), key=lambda t: -t["dias"])


def turmas_disponiveis(ex_id, today):
    return [t for t in turmas_do_exame(ex_id) if status_turma(t, today) != "encerrada"]


def turma(ex_id, dias):
    return next(t for t in DATA["turmas"] if t["exame"] == ex_id and t["dias"] == dias)


def cedo(A, today):
    if A.get("situacao") == "formado" or not A.get("periodo"):
        return False
    return not any(elegivel(A, ex, today) for ex in futuros(today))


def primeira_vez(A, today):
    P = int(A["periodo"])
    if A.get("regime") == "ano":
        return {"ano": year(today) + (R["anoMinimo"] - P), "sem": None}
    return sem_label(sem_idx(today) + (R["periodoMinimo"] - P))


def pergunta_tentativa(A):
    # Asked to everyone who stays in the quiz: it qualifies the lead and shapes the laudo copy.
    return True


def recomendar(A, today):
    if A.get("tentativa") == "f2":
        return {"tipo": "f2"}
    if cedo(A, today):
        return {"tipo": "cedo", "quando": primeira_vez(A, today)}
    cands = [ex for ex in futuros(today) if status_exame(A, ex, today) == "ok"]
    if not cands:
        return {"tipo": "sem_prova"}
    h = DATA["horasValor"].get(A.get("horas"), 0)
    # Every turma starts from zero, so only the time left and the hours a day matter.
    passos = [
        ("ok", lambda t: horas_turma(t) <= h),
        ("acima", lambda t: True),
    ]
    for tipo, ok in passos:
        for ex in cands:
            t = next((t for t in turmas_disponiveis(ex["id"], today) if ok(t)), None)
            if t:
                return {"tipo": tipo, "exame": ex["id"], "turma": t["dias"]}
    return {"tipo": "sem_turma", "exame": cands[0]["id"]}


def atalho(A, today, rec):
    if not rec.get("exame"):
        return None
    h = DATA["horasValor"].get(A.get("horas"), 0)
    for ex in futuros(today):
        if ex["id"] == rec["exame"]:
            break
        if status_exame(A, ex, today) != "ok":
            continue
        ts = sorted((t for t in turmas_disponiveis(ex["id"], today)
                     if horas_turma(t) > h), key=horas_turma)
        if ts:
            return {"exame": ex["id"], "turma": ts[0]["dias"], "horas": horas_turma(ts[0])}
    return None


def escada(A, today):
    if A.get("situacao") == "formado" or not A.get("periodo"):
        return []
    fim = max(sem_idx(ex["corte"]) for ex in DATA["exames"])
    out = []
    for i in range(sem_idx(today), fim + 1):
        lab = sem_label(i)
        ref = f"{lab['ano']}-{'03' if lab['sem'] == 1 else '09'}-01"
        out.append({"ano": lab["ano"], "sem": lab["sem"], "pos": posicao_em(A, today, ref),
                    "exames": [ex["id"] for ex in DATA["exames"] if sem_idx(ex["corte"]) == i],
                    "agora": i == sem_idx(today)})
    return out


def oferece_anual(A, rec):
    """The anual turma is offered only to leads whose exam is the OAB 50 (its turmas open late)."""
    return rec.get("exame") in DATA.get("anual", {}).get("exames", [])


def dias_ate(today, s):
    return day(s) - day(today)
