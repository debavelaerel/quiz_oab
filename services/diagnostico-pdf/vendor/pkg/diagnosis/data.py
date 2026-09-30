"""Loads _build/data.json, the single source shared with the quiz."""
import json
import pathlib

DATA = json.loads((pathlib.Path(__file__).resolve().parents[1] / "_build" / "data.json").read_text(encoding="utf-8"))
EXAMES = {e["id"]: e for e in DATA["exames"]}
P = DATA["perguntas"]
