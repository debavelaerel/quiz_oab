#!/usr/bin/env python3
"""Runs logic.js (quiz) and diagnosis/logic.py (laudo) over every answer combination,
week by week from Sep/2026 to Oct/2027, and fails on any divergence.
Also reports which recommendation types were reached."""
import collections, datetime, itertools, json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from diagnosis import logic as L          # noqa: E402
from diagnosis.pdf import _node          # noqa: E402


def combos():
    horas = ["h15", "h2", "h25", "h3", "h35", "h4"]
    base = [("nunca", None, n) for n in ("b0", "b1", "b2")] + [("reprov", p, None) for p in ("p0", "p1", "p2")]
    cursos = [("formado", None, None)] + [("cursando", "sem", str(p)) for p in range(1, 11)] \
        + [("cursando", "ano", str(p)) for p in range(1, 6)]
    for (sit, reg, per), (ten, pts, niv), insc, h in itertools.product(cursos, base, ("s", "n"), horas):
        A = {"situacao": sit, "horas": h, "inscrito": insc}
        if reg:
            A.update(regime=reg, periodo=per)
        if not L.pergunta_tentativa(A):
            ten, pts, niv = "nunca", None, niv or "b1"
        A["tentativa"] = ten
        if pts: A["pontos"] = pts
        if niv: A["nivel"] = niv
        yield A


def main():
    dates, d = [], datetime.date(2026, 9, 1)
    while d <= datetime.date(2027, 10, 1):
        dates.append(d.isoformat()); d += datetime.timedelta(days=5)
    cases = [(A, t) for t in dates for A in combos()]
    py = []
    for A, t in cases:
        rec = L.recomendar(A, t)
        insc = L.exame_inscricao_fechada(A, t)
        py.append({"rec": rec, "atalho": L.atalho(A, t, rec), "escada": L.escada(A, t),
                   "insc": insc["id"] if insc else None, "cedo": L.cedo(A, t)})
    js_src = f"""
const Q = require({json.dumps(str(HERE / 'logic.js'))});
const L = Q.make(require({json.dumps(str(HERE / 'data.json'))}));
const cases = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const out = cases.map(([A, t]) => {{
  const rec = L.recomendar(A, t); const i = L.exameInscricaoFechada(A, t);
  return {{rec, atalho: L.atalho(A, t, rec), escada: L.escada(A, t), insc: i ? i.id : null, cedo: L.cedo(A, t)}};
}});
process.stdout.write(JSON.stringify(out));
"""
    r = subprocess.run([_node(), "-e", js_src], input=json.dumps(cases), capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    js = json.loads(r.stdout)
    norm = lambda o: json.loads(json.dumps(o))
    bad = [(c, p, j) for c, p, j in zip(cases, py, js) if norm(p) != j]
    tipos = collections.Counter(p["rec"]["tipo"] for p in py)
    print(f"{len(cases)} casos, {len(dates)} datas. Tipos: {dict(tipos)}")
    if bad:
        for c, p, j in bad[:5]:
            print("DIVERGE", c, "\n  py", p, "\n  js", j)
        sys.exit(f"{len(bad)} divergências")
    print("quiz e laudo concordam em todos os casos")


if __name__ == "__main__":
    main()
