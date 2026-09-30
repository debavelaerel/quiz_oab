#!/usr/bin/env python3
"""Build the self-contained quiz: inject data.json, logic.js and fonts, inline every assets/ url as base64."""
import base64, json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "index.html"

LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
LATIN_EXT = "U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF"
MIME = {".woff2": "font/woff2", ".otf": "font/otf", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml"}


def data_uri(rel):
    p = ROOT / rel
    return f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()


def fonts_css():
    # DegularDemo has no accents nor punctuation: numbers only, Poppins covers the rest.
    css = ["@font-face{font-family:'Degular';font-weight:900;src:url('assets/fonts/DegularDemo-Black.otf') format('opentype')}"]
    for w in (400, 500, 600, 700, 800):
        for sub, rng in (("latin", LATIN), ("latin-ext", LATIN_EXT)):
            css.append(f"@font-face{{font-family:'Poppins';font-weight:{w};font-display:swap;src:url('assets/fonts/Poppins-{w}-{sub}.woff2') format('woff2');unicode-range:{rng}}}")
    return "\n".join(css)


def inline(html):
    html = re.sub(r"url\('(assets/[^']+)'\)", lambda m: f"url('{data_uri(m.group(1))}')", html)
    assert "assets/" not in html, "relative asset path left behind"
    return html


def main():
    data = json.loads((HERE / "data.json").read_text(encoding="utf-8"))
    src = (HERE / "index.src.html").read_text(encoding="utf-8")
    out = (src.replace("{{FONTS}}", fonts_css())
              .replace("{{DATA}}", json.dumps(data, ensure_ascii=False))
              .replace("{{LOGIC}}", (HERE / "logic.js").read_text(encoding="utf-8")))
    for m in ("{{FONTS}}", "{{DATA}}", "{{LOGIC}}"):
        assert m not in out, f"{m} not replaced"
    out = inline(out)
    OUT.write_text(out, encoding="utf-8")
    print(f"{OUT.name}: {len(out)/1024:.0f} KB")


if __name__ == "__main__":
    main()
