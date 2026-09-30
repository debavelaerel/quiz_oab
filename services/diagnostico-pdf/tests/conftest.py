import json
import pathlib
import sys

SERVICO = pathlib.Path(__file__).resolve().parents[1]
RAIZ = SERVICO.parents[1]
sys.path.insert(0, str(SERVICO / "vendor" / "pkg"))
sys.path.insert(0, str(SERVICO))

REF = RAIZ / "reference" / "qual-a-oab-dev"
CASOS = json.loads((REF / "casos-de-teste.json").read_text(encoding="utf-8"))["casos"]
