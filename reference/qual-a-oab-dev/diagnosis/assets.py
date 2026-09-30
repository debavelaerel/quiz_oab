"""Laudo CSS with fonts and logo embedded (the PDF is rendered from a temp file)."""
import base64
import pathlib

ASSETS = pathlib.Path(__file__).resolve().parents[1] / "assets"


def _b64(name, mime):
    return f"data:{mime};base64," + base64.b64encode((ASSETS / name).read_bytes()).decode()


def fonts():
    css = [f"@font-face{{font-family:'Degular';font-weight:900;src:url('{_b64('fonts/DegularDemo-Black.otf', 'font/otf')}')}}"]
    for w in (400, 500, 600, 700, 800):
        for sub in ("latin", "latin-ext"):
            css.append(f"@font-face{{font-family:'Poppins';font-weight:{w};src:url('{_b64(f'fonts/Poppins-{w}-{sub}.woff2', 'font/woff2')}')}}")
    return "\n".join(css)


CSS = """
:root{--roxo:#5a009f;--yel:#f5c518;--deep:#3b0069;--ink:#2d2733;--cinza:#4f4f4f;--mute:#8d7f9b;
--lil:#f5eefc;--lil2:#e7d8f6;--lil3:#c9a0ee;--yelt:#fff6d1;--yeld:#7a5c00;--ok:#1f9d63;--okt:#e6f6ee;
--grad:linear-gradient(135deg,#3b0069 0%,#5a009f 55%,#7a2fd0 100%)}
@page{size:A4}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Poppins',sans-serif;color:var(--ink);font-size:9.6pt;line-height:1.5;padding:0 15mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
b{font-weight:700}
.num{font-family:'Degular','Poppins',sans-serif;font-weight:900}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:3mm 6mm;background:var(--deep);border-radius:3.5mm;margin-bottom:5mm}
.lg{display:block;width:34mm;height:9.6mm;background:url('LOGO') left center/contain no-repeat}
.sec{font-weight:600;font-size:7.4pt;letter-spacing:.06em;text-transform:uppercase;color:var(--lil3)}
.hero{background:var(--grad);color:#fff;border-radius:5mm;padding:7mm 8mm 6mm;position:relative;overflow:hidden;margin-bottom:5mm}
.hero::after{content:'';position:absolute;right:-22mm;top:-18mm;width:80mm;height:80mm;background:url('OLHO') center/contain no-repeat;opacity:.1}
.hero .hi{font-size:11.5pt;opacity:.95}
.big{display:flex;align-items:baseline;gap:3mm;margin:1mm 0 4mm}
.big span{font-weight:800;font-size:24pt}
.big .num{font-size:78pt;line-height:.82;color:var(--yel)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;position:relative;z-index:1}
.kpis div{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);border-radius:3mm;padding:2.6mm 3.4mm}
.kpis span{display:block;font-size:7.2pt;font-weight:500;opacity:.9}
.kpis b{font-size:17pt;line-height:1.1}
h2{font-weight:700;font-size:13pt;color:var(--roxo);line-height:1.25;margin-bottom:2.2mm}
p+p{margin-top:2mm}
.blk{margin-top:6mm;break-inside:avoid}
.blk:empty{display:none}
.note{color:var(--cinza);font-size:8.8pt;margin-bottom:2.5mm}
.alert,.tip{border-radius:3.5mm;padding:3.6mm 5mm 3.6mm 14mm;position:relative;margin-top:3mm;break-inside:avoid}
.alert{background:var(--yelt)}
.tip{background:var(--lil)}
.alert::before,.tip::before{content:'!';position:absolute;left:4.4mm;top:3.8mm;width:6mm;height:6mm;border-radius:50%;background:var(--yel);color:var(--deep);font-weight:800;font-size:9pt;line-height:6mm;text-align:center}
.tip::before{background:var(--roxo);color:#fff;content:'i'}
.lab{display:block;font-weight:700;font-size:7.2pt;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.6mm}
.alert .lab{color:var(--yeld)} .tip .lab{color:var(--roxo)}
table{width:100%;border-collapse:separate;border-spacing:0 1.4mm;font-size:8.8pt}
th{text-align:left;font-size:7.2pt;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.05em;padding:0 3mm}
td{padding:2.3mm 3mm;background:var(--lil);vertical-align:middle}
td:first-child{border-radius:2.5mm 0 0 2.5mm} td:last-child{border-radius:0 2.5mm 2.5mm 0}
.lad tr.hit td{background:var(--okt)}
.lad em{font-style:normal;font-size:7pt;font-weight:700;color:var(--deep);background:var(--yel);border-radius:99px;padding:.3mm 2mm;margin-left:1.5mm}
.tag{display:inline-block;font-size:7.6pt;font-weight:600;border-radius:99px;padding:.5mm 2.4mm;margin:.4mm 1mm .4mm 0}
.tag.ok{background:var(--ok);color:#fff} .tag.no{background:#fff;color:var(--mute);border:1px solid var(--lil2)}
.exs{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}
.ex{border:1.3px solid var(--lil2);border-radius:4mm;padding:4mm 4mm 3.6mm;font-size:8.6pt}
.ex.rec{border:2px solid var(--roxo);background:var(--lil)}
.ex.no{opacity:.72}
.exh{display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm}
.nm{font-weight:800;font-size:12pt;color:var(--roxo)} .nm .num{font-size:19pt}
.chip{white-space:nowrap;font-size:6.8pt;font-weight:700;border-radius:99px;padding:.6mm 2.2mm;background:var(--lil2);color:var(--roxo);text-transform:uppercase;letter-spacing:.04em}
.ex.rec .chip{background:var(--roxo);color:#fff}
.ex.no .chip{background:#eee;color:var(--mute)}
.ev{display:flex;justify-content:space-between;border-top:1px solid var(--lil2);padding:1.2mm 0;font-size:8pt}
.ev span{color:var(--mute)}
.ex p{margin-top:2mm;color:var(--cinza);line-height:1.45}
.tt td:first-child,.tt td:nth-child(3),.tt td:nth-child(4){white-space:nowrap}
.tt td:nth-child(2){font-size:8pt;color:var(--cinza)}
.tt .num{font-size:15pt;color:var(--roxo)}
.tt tr.rec td{background:var(--roxo);color:#fff}
.tt tr.rec td:nth-child(2){color:#fff}
.tt tr.rec .num{color:#fff}
.tt tr.off td{background:#f7f5f9;color:var(--mute)}
.tt tr.off .num{color:var(--lil3)}
.st{font-weight:700;font-size:7.8pt;white-space:nowrap}
.two{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.soft{background:var(--lil);border-radius:4mm;padding:4.5mm 5mm}
.soft:empty{display:none}
.soft h2{font-size:11pt}
.soft p{font-size:9pt;color:var(--cinza)}
.band{background:var(--grad);color:#fff;border-radius:4.5mm;padding:5.5mm 7mm;margin-top:6mm;break-inside:avoid}
.band h2{color:var(--yel)}
.fi td{font-size:8.4pt;background:#fbf9fd}
.fi td:first-child{color:var(--cinza);width:62%}
.why{border-left:1.6mm solid var(--yel);background:var(--yelt);border-radius:0 4mm 4mm 0;padding:4.5mm 6mm;margin-top:1mm;break-inside:avoid}
.why .lab{color:var(--yeld)}
.why p{font-size:10.6pt;line-height:1.55;color:var(--ink)}
.tqs{display:grid;gap:2.6mm;margin-top:3mm}
.tq{border:1.3px solid var(--lil2);border-radius:3.5mm;padding:3.2mm 4.5mm;break-inside:avoid;font-size:8.8pt}
.tq p{color:var(--cinza);margin-top:1.4mm}
.tqh{display:flex;align-items:center;gap:2.5mm}
.tn{width:6.5mm;height:6.5mm;border-radius:50%;background:var(--lil);color:var(--roxo);display:grid;place-items:center;font-size:11pt;line-height:1}
.tqh b{font-size:10pt;color:var(--roxo)}
.src2{font-size:7.6pt;color:var(--mute)}
.res2{margin-left:auto;font-weight:700;font-size:7.4pt;text-transform:uppercase;letter-spacing:.05em;border-radius:99px;padding:.6mm 2.4mm}
.tq.ok .res2{background:var(--okt);color:var(--ok)} .tq.no .res2{background:var(--yelt);color:var(--yeld)}
.tqa b{color:var(--ink)}
.blk h2 .num{font-size:17pt}
.sig{background:var(--lil);border-radius:3.5mm;padding:3.4mm 5mm;margin-top:2.4mm;break-inside:avoid}
.sig .lab{color:var(--roxo)}
.h3s{font-size:10.5pt;color:var(--roxo);margin:5mm 0 1mm;break-after:avoid}
h2{break-after:avoid}
.sum{margin-top:3mm;font-size:9.6pt}
.fix{margin-top:1.8mm;color:var(--roxo);font-weight:600}
.alert .fix{color:var(--deep)}
.agg{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:2mm}
.ag{border:1.3px solid var(--lil2);border-radius:3.5mm;padding:3.6mm 4.4mm;break-inside:avoid;font-size:8.7pt}
.ag .you{display:inline-block;font-size:7pt;font-weight:600;color:var(--yeld);background:var(--yelt);border-radius:99px;padding:.6mm 2.4mm;margin-bottom:1.6mm}
.ag h3{font-size:9.8pt;color:var(--roxo);margin-bottom:1mm}
.ag p{color:var(--cinza);line-height:1.5}
.ags{break-inside:auto}
.agb{display:grid;gap:3mm;margin-top:2mm}
.ag.dest{border:2px solid var(--roxo);background:var(--lil);font-size:9.4pt;padding:4.4mm 5.4mm}
.ag.dest h3{font-size:11pt}
.ag.dest .you{background:var(--yel);color:var(--deep)}
.src{font-size:7.2pt;color:var(--mute);margin:5mm 0 2mm}
"""


def head_css():
    return (fonts() + CSS.replace("LOGO", _b64("logo-branco.png", "image/png"))
            .replace("OLHO", _b64("olho-branco.svg", "image/svg+xml")))
