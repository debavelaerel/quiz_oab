"""Builds the laudo HTML (A4) from the lead's answers. All copy lives here."""
import datetime
import html as H

from . import logic as L
from .answers import label, CAMPOS
from .assets import head_css
from .data import DATA, EXAMES, P
from .argumentos import TESTE_VDE, cards as arg_cards, menos_2h

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
         "setembro", "outubro", "novembro", "dezembro"]


def br(s):
    return f"{s[8:10]}/{s[5:7]}/{s[:4]}"


def brc(s):
    return f"{s[8:10]}/{s[5:7]}"


def horas_txt(h):
    inteiro = int(h)
    return f"{inteiro}h" if h == inteiro else f"{inteiro}h30"


def junta(itens):
    return itens[0] if len(itens) == 1 else ", ".join(itens[:-1]) + " e " + itens[-1]


def fim_semestre(today):
    return f"31 de dezembro de {today[:4]}" if L.sem_idx(today) % 2 else f"30 de junho de {today[:4]}"


def e(s):
    return H.escape(str(s))


def pos_label(A, pos):
    if A.get("regime") == "ano":
        return "curso concluído" if pos > 5 else f"{pos}º ano"
    return "curso concluído" if pos > 10 else f"{pos}º período"


# ---------------------------------------------------------------- blocks
def bloco_porque(A, today, rec):
    ex = EXAMES[rec["exame"]]
    t = L.turma(rec["exame"], rec["turma"]) if rec.get("turma") else None
    horas = label(A, "horas").lower()
    ps = []
    if A.get("situacao") == "formado":
        ps.append("Como você já é bacharel em Direito, pode fazer <b>qualquer uma das três provas de 2027</b>. "
                  "O que decide a melhor é o tempo: quanto falta pra cada prova e quanto você consegue estudar por dia.")
    else:
        lib = [x["nome"] for x in DATA["exames"] if L.status_exame(A, x, today) != "passou" and L.elegivel(A, x, today)]
        unidade = "5º ano" if A.get("regime") == "ano" else "9º período"
        q = L.primeira_vez(A, today)
        quando = f"no {q['sem']}º semestre de {q['ano']}" if q.get("sem") else f"em {q['ano']}"
        chega = (f"Seguindo a grade, você chega no {unidade} {quando}" if L.posicao_em(A, today, today) < (5 if A.get('regime') == 'ano' else 9)
                 else f"Você já está no {unidade} ou depois dele")
        ps.append(f"Pra fazer a prova, o edital exige matrícula no <b>{unidade}</b> até o prazo de cada edição. "
                  f"Hoje você está no {label(A, 'periodo')}. {chega}, e isso libera pra você: <b>{junta(lib)}</b>.")
    if rec["tipo"] == "ok":
        ps.append(f"Entre as provas liberadas, a <b>{ex['nome']}</b> é a primeira em que o tempo até a prova e a sua rotina "
                  f"({horas} por dia) cabem numa turma do VDE: a <b>turma de {t['dias']} dias</b>. "
                  "Todas as turmas começam do zero, então não importa de onde você parte.")
    elif rec["tipo"] == "acima":
        ps.append(f"Quanto menos horas por dia, mais cedo vale começar. Por isso a <b>{ex['nome']}</b>: é a primeira prova com a turma "
                  f"de mais antecedência ainda disponível, a de {t['dias']} dias, com {horas_txt(L.horas_turma(t))} por dia. "
                  "Encaixar esse tempo na sua semana é o primeiro passo do seu plano.")
    else:
        ps.append(f"A <b>{ex['nome']}</b> é a sua próxima prova possível. As turmas dela já fecharam, "
                  "então o consultor vai te mostrar o melhor caminho pra estudar até lá.")
    return "<h2>Por que a " + e(ex["nome"]) + "</h2>" + "".join(f"<p>{p}</p>" for p in ps)


def bloco_escada(A, today):
    rows = L.escada(A, today)
    if not rows:
        return ""
    unidade_min = 5 if A.get("regime") == "ano" else 9
    linhas = []
    for r in rows:
        prazos = [EXAMES[x] for x in r["exames"]]
        prazo_txt = "".join(
            f"<span class='tag {'ok' if r['pos'] >= unidade_min else 'no'}'>{x['nome']}: prazo {brc(x['corte'])}</span>"
            for x in prazos)
        agora = " <em>agora</em>" if r["agora"] else ""
        linhas.append(f"<tr class='{'hit' if r['pos'] >= unidade_min else ''}'><td>{r['sem']}º sem. {r['ano']}{agora}</td>"
                      f"<td><b>{pos_label(A, r['pos'])}</b></td><td>{prazo_txt}</td></tr>")
    return ("<h2>A sua projeção, semestre a semestre</h2>"
            "<p class='note'>Considera que você avança um período por semestre, sem trancar nem atrasar.</p>"
            "<table class='lad'><thead><tr><th>Semestre</th><th>Você vai estar no</th><th>Prazo de matrícula que cai aqui</th></tr></thead>"
            f"<tbody>{''.join(linhas)}</tbody></table>"
            "<p class='note'>As datas das turmas são uma previsão do VDE e ainda podem mudar. O time confirma as datas oficiais na conversa.</p>")


def bloco_exames(A, today, rec, atalho):
    cards = []
    plano_b = False
    for ex in DATA["exames"]:
        st = L.status_exame(A, ex, today)
        if st == "passou":
            continue
        if ex["id"] == rec.get("exame"):
            chip, cls = "A sua prova", "rec"
            txt = "É a recomendada pra você."
        elif st == "nao_libera":
            pos = L.posicao_em(A, today, ex["corte"])
            chip, cls = "Não libera", "no"
            txt = f"No prazo dela ({br(ex['corte'])}) você ainda vai estar no {pos_label(A, pos)}."
        elif st == "sem_inscricao":
            chip, cls = "Sem inscrição", "no"
            txt = f"As inscrições fecharam em {br(ex['inscFim'])} e você não se inscreveu."
        elif L.day(ex["fase1"]) < L.day(EXAMES[rec["exame"]]["fase1"]):
            chip, cls = "No aperto", "mid"
            txt = "Até essa prova, as turmas que ainda abrem pedem mais horas por dia do que você tem hoje."
            if atalho and atalho["exame"] == ex["id"]:
                txt += (f" Se você chegar a <b>{horas_txt(atalho['horas'])} por dia</b>, dá pra mirar nela "
                        f"com a turma de {atalho['turma']} dias.")
        else:
            chip, cls = "Liberada", "mid"
            txt = (f"Também liberada, pra quem precisar de mais tempo." if plano_b
                   else f"Fica como plano B se a {EXAMES[rec['exame']]['nome']} não sair como você quer.")
            plano_b = True
        cards.append(f"<div class='ex {cls}'><div class='exh'><span class='nm'>OAB <b class='num'>{ex['id']}</b></span>"
                     f"<span class='chip'>{chip}</span></div>"
                     f"<div class='ev'><span>Inscrição</span><b>{brc(ex['inscIni'])} a {br(ex['inscFim'])}</b></div>"
                     f"<div class='ev'><span>1ª fase</span><b>{br(ex['fase1'])}</b></div>"
                     f"<div class='ev'><span>2ª fase</span><b>{br(ex['fase2'])}</b></div>"
                     f"<p>{txt}</p></div>")
    return "<h2>As provas de 2027 pra você</h2><div class='exs'>" + "".join(cards) + "</div>"


def bloco_turmas(A, today, rec):
    if not rec.get("exame"):
        return ""
    ex = EXAMES[rec["exame"]]
    h = DATA["horasValor"].get(A.get("horas"), 0)
    linhas = []
    for t in L.turmas_do_exame(ex["id"]):
        st = L.status_turma(t, today)
        ht = L.horas_turma(t)
        if t["dias"] == rec.get("turma"):
            s, cls = "Indicada pra você", "rec"
        elif st == "encerrada":
            s, cls = "Matrículas encerradas", "off"
        elif ht > h:
            s, cls = f"Pede {horas_txt(ht)} por dia", "off"
        else:
            s, cls = "Cabe na sua rotina", ""
        mat = "encerradas" if st == "encerrada" else f"{brc(t['vendasIni'])} a {brc(t['vendasFim'])}"
        linhas.append(f"<tr class='{cls}'><td><b class='num'>{t['dias']}</b> dias</td>"
                      f"<td>{e(DATA['rotinas'][str(t['dias'])]['rotina'])}</td>"
                      f"<td>{mat}</td><td>{br(t['inicio'])}</td><td><span class='st'>{s}</span></td></tr>")
    return (f"<h2>As turmas do VDE pra {e(ex['nome'])}</h2>"
            f"<p class='note'>Você disse ter <b>{label(A, 'horas').lower()}</b> por dia. Todas as turmas preparam do zero: "
            "o que muda entre elas é quanto tempo falta pra prova e quantas horas por dia cada uma pede.</p>"
            "<table class='tt'><thead><tr><th>Turma</th><th>Rotina</th><th>Matrícula prevista</th><th>Início previsto</th><th></th></tr></thead>"
            f"<tbody>{''.join(linhas)}</tbody></table>"
            "<p class='note'>As datas das turmas são uma previsão do VDE e ainda podem mudar. O time confirma as datas oficiais na conversa.</p>")


def oferta(rec):
    """(prova, dias, horas) of the recommended turma: copy names it when the longer ones already closed."""
    if not rec or not rec.get("turma"):
        return None
    t = L.turma(rec["exame"], rec["turma"])
    return EXAMES[rec["exame"]]["nome"], t["dias"], horas_txt(L.horas_turma(t))


def h15_txt(rec):
    o = oferta(rec)
    return menos_2h(*o) if o else None


def alertas(A, today, rec):
    out = []
    if A.get("grade") in ("atraso", "naosei"):
        out.append(("alert", "Confirme o seu período", "A conta usa o período que você informou. Com matéria atrasada ou fora da grade, a sua matrícula pode estar num período diferente. Confirma com a coordenação antes de se inscrever."))
    if A.get("horas") == "h15":
        out.append(("tip", "Menos horas por dia, mais antecedência", h15_txt(rec) or "Com menos de 2h por dia, a estratégia é começar mais cedo. A turma de 180 dias é a que tem mais tempo até a prova: 2h de segunda a sexta e fim de semana livre. Organizar a semana pra chegar nessas 2h é o primeiro passo do seu plano."))
    elif rec.get("tipo") == "acima":
        t = L.turma(rec["exame"], rec["turma"])
        out.append(("tip", "Ajuste de rotina", f"A turma indicada pede {horas_txt(L.horas_turma(t))} por dia. Na conversa, o time do VDE te ajuda a encaixar esse tempo na sua semana."))
    return "".join(f"<div class='{c}'><span class='lab'>{lab}</span><p>{txt}</p></div>" for c, lab, txt in out)


MOTIVO = {
    "ciclo": "Você quer fechar o ciclo da faculdade e seguir outros planos. Então vale resolver a OAB de uma vez, com uma preparação objetiva, pra ela não ficar pendurada no seu futuro.",
    "orgulho": "Você quer esse orgulho, pra você e pra sua família. Guarda a imagem do dia do resultado: é ela que vai te levantar nos dias em que o cansaço falar mais alto.",
    "advocacia": "Advogar é o seu sonho, e a carteira é a porta de entrada. Cada dia de cronograma cumprido é um passo concreto na direção dele.",
    "concursos": "Você mira os concursos jurídicos. A base que você constrói pra OAB, com Constitucional, Administrativo, Penal e os processos, é a mesma que vai te sustentar nos concursos.",
    "mudar": "Você quer mudar de vida. A carteira abre portas que hoje estão fechadas, e essa mudança começa no primeiro dia de estudo, não no dia do resultado.",
    "provar": "Você quer provar que consegue. A melhor resposta é o seu nome na lista, e ela vem com constância, um dia de cada vez.",
    "adiei": "Você já adiou demais. Com a prova escolhida e uma turma com data de início, não existe mais depois: a contagem já começou.",
    "emprego": "O seu trabalho depende da carteira. Aqui a aprovação também é estabilidade, e dá pra planejar o estudo em volta da rotina que você já tem.",
}
COMPROMISSO = {
    "tudo": "E você disse que faz o que for preciso. É essa disposição que separa quem passa de quem quase passa.",
    "bastante": "E você topa abrir mão de algumas coisas. É exatamente o que a turma indicada pede: um espaço fixo no seu dia.",
    "pouco": "Você prefere mexer pouco na rotina, e por isso a turma indicada é a que cabe no tempo que você já tem.",
    "decidindo": "Você ainda está decidindo se é a hora. Esse diagnóstico serve pra isso: mostrar que dá, e como.",
}


def multi(A, campo):
    return [v for v in (A.get(campo) or "").split("+") if v]


def bloco_porque_pessoal(A):
    ps = [MOTIVO[m] for m in multi(A, "motivo") if m in MOTIVO] + [COMPROMISSO.get(A.get("compromisso"), "")]
    ps = [p for p in ps if p]
    return ("<div class='why'><span class='lab'>O seu porquê</span>" + "".join(f"<p>{p}</p>" for p in ps) + "</div>") if ps else ""


def bloco_teste(A):
    resp = A.get("teste")
    if not resp:
        return ""
    qs = DATA["teste"]
    ok = sum(1 for q, r in zip(qs, resp) if r == q["gabarito"])
    leitura = {0: "Hoje a sua base pra OAB está no começo, e tudo bem: é pra isso que as turmas começam do zero.",
               1: "Hoje a sua base pra OAB está no começo, e tudo bem: é pra isso que as turmas começam do zero.",
               2: "Você já tem pontos de apoio, mas a base ainda tem buracos que a prova vai achar.",
               3: "Você acertou mais da metade. A base existe; falta organizar e treinar no nível da FGV.",
               4: "Resultado forte. O trabalho agora é manter o nível em todas as disciplinas, não só nessas cinco.",
               5: "Você gabaritou. Com esse nível, o risco é relaxar: a prova tem 80 questões, e a constância decide."}[ok]
    erradas = [q for q, r in zip(qs, resp) if r != q["gabarito"]]
    foco = ""
    if erradas:
        # Ética first: it is the heaviest subject and the most serious signal.
        erradas.sort(key=lambda q: not q["sinal"].get("grave"))
        area = []
        for q in erradas:
            area += [x for x in q["sinal"]["area"] if x not in area]
        pontos = sum(DATA["pesos"][x] for x in area)
        sinais = "".join(f"<div class='{'alert' if q['sinal'].get('grave') else 'sig'}'><span class='lab'>Errou {e(q['disciplina'])}</span><p>{e(q['sinal']['texto'])}</p><p class='fix'>{e(TESTE_VDE.get(q['id'], ''))}</p></div>"
                         for q in erradas)
        foco = (f"<h3 class='h3s'>O que os seus erros dizem</h3>{sinais}"
                f"<p class='sum'>Somando as disciplinas ligadas aos seus erros, <b>{pontos} das 80 questões</b> da prova pedem atenção: {junta(area)}.</p>")
    linhas = []
    for i, (q, r) in enumerate(zip(qs, resp), 1):
        acertou = r == q["gabarito"]
        sua = "não soube" if r == "X" else r
        linhas.append(f"<div class='tq {'ok' if acertou else 'no'}'><div class='tqh'><span class='tn num'>{i}</span>"
                      f"<b>{e(q['disciplina'])}</b><span class='src2'>OAB {q['exame']}, questão {q['numero']}</span>"
                      f"<span class='res2'>{'Acertou' if acertou else ('Não soube' if r == 'X' else 'Errou')}</span></div>"
                      f"<p class='tqa'>Sua resposta: <b>{sua}</b> · Gabarito: <b>{q['gabarito']}</b></p>"
                      f"<p>{e(q['comentario'])}</p></div>")
    return (f"<h2>O seu teste de nível: <span class='num'>{ok}</span> de {len(qs)}</h2><p>{leitura}</p>{foco}"
            f"<h3 class='h3s'>A correção, questão por questão</h3><div class='tqs'>{''.join(linhas)}</div>")


def bloco_argumentos(A, rec=None):
    cs = arg_cards(A, oferta(rec))
    if not cs:
        return ""
    def resp(c, v):
        if c in ("trava", "motivo", "rotina"):  # multiple choice: show only this option
            return dict((o[0], o[1]) for o in P[c]["opcoes"])[v]
        return label(A, c)

    def card(c, v, t, x, cls="ag"):
        return (f"<div class='{cls}'><span class='you'>Você respondeu: {e(resp(c, v))}</span>"
                f"<h3>{e(t)}</h3><p>{e(x)}</p></div>")

    # What holds the lead back gets the strongest argument: full width, first.
    travas = "".join(card(*k, cls="ag dest") for k in cs if k[0] == "trava")
    resto = "".join(card(*k) for k in cs if k[0] != "trava")
    return ("<section class='blk ags'><h2>Como o VDE 1ª fase resolve cada ponto do seu diagnóstico</h2>"
            "<p class='note'>Pra cada resposta que você deu no quiz, o que o método e a plataforma do VDE têm pra te ajudar.</p>"
            + (f"<h3 class='h3s'>O que te trava, e como o VDE destrava</h3><div class='agb'>{travas}</div>" if travas else "")
            + (f"<h3 class='h3s'>O resto do seu diagnóstico</h3><div class='agg'>{resto}</div>" if resto else "")
            + "</section>")


def ficha(A, today):
    linhas = []
    # Same order the lead saw in the quiz.
    ordem = ["situacao", "regime", "periodo", "grade", "tentativa", "vezes", "pontos", "nivel", "metodo", "trava", "motivo", "compromisso", "trabalho", "rotina", "horas", "vde"]
    comercial = {"investir", "parcela"}  # sales-only answers, not shown to the lead
    for c in ordem + [c for c in CAMPOS if c not in ordem and c not in comercial]:
        v = label(A, c)
        if v is None:
            continue
        titulo = P[c]["titulo"]
        if c == "inscrito":
            continue
        if c == "metodo" and A.get("tentativa") == "reprov":
            titulo = P[c]["tituloReprov"]
        if c == "periodo":
            titulo = (P[c]["tituloAno"].replace("{ano}", today[:4]) if A.get("regime") == "ano"
                      else titulo.replace("{fimSemestre}", fim_semestre(today)))
        linhas.append(f"<tr><td>{e(titulo)}</td><td><b>{e(v)}</b></td></tr>")
    if A.get("inscrito"):
        linhas.append(f"<tr><td>Inscrição na prova já fechada</td><td><b>{e(label(A, 'inscrito'))}</b></td></tr>")
    return "<h2>As suas respostas</h2><table class='fi'>" + "".join(linhas) + "</table>"


# ---------------------------------------------------------------- page
def build_html(A, today, nome=""):
    rec = L.recomendar(A, today)
    if rec["tipo"] in ("f2", "cedo", "sem_prova"):
        raise ValueError(f"esse lead não recebe laudo (resultado: {rec['tipo']})")
    ex = EXAMES[rec["exame"]]
    at = L.atalho(A, today, rec)
    t = L.turma(rec["exame"], rec["turma"]) if rec.get("turma") else None
    dias = L.dias_ate(today, ex["fase1"])
    d = datetime.date.fromisoformat(today)
    quando = f"{d.day} de {MESES[d.month - 1]} de {d.year}"
    nome = nome.strip()
    kpis = [("1ª fase", br(ex["fase1"])), ("Faltam", f"{dias} dias")]
    if t:
        kpis.append(("Turma indicada", f"{t['dias']} dias"))
        kpis.append(("Início previsto", br(t["inicio"])))
    kpi_html = "".join(f"<div><span>{k}</span><b class='num'>{v}</b></div>" for k, v in kpis)
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Diagnóstico · {e(nome or 'lead')} · {e(ex['nome'])}</title><style>{head_css()}</style></head><body>
<header class="hdr"><span class="lg"></span><span class="sec">Diagnóstico · {quando}</span></header>
<section class="hero">
  <p class="hi">{e(nome + ', a' if nome else 'A')} OAB da sua aprovação é a</p>
  <div class="big"><span>OAB</span><b class="num">{ex['id']}</b></div>
  <div class="kpis">{kpi_html}</div>
</section>
{bloco_porque_pessoal(A)}
{alertas(A, today, rec)}
<section class="blk">{bloco_porque(A, today, rec)}</section>
<section class="blk">{bloco_escada(A, today)}</section>
<section class="blk">{bloco_exames(A, today, rec, at)}</section>
<section class="blk">{bloco_turmas(A, today, rec)}</section>
<section class="blk">{bloco_teste(A)}</section>
{bloco_argumentos(A, rec)}
<section class="band"><h2>O seu próximo passo: um plano de ação pra começar agora</h2><p>Aqui na conversa, o time do VDE monta com você o seu plano de ação pra começar AGORA a se preparar pra {e(ex['nome'])}: por onde começar, em que ordem estudar e como encaixar na sua semana{', já dentro da turma de ' + str(t['dias']) + ' dias' if t else ''}. Você não sai daqui só com um diagnóstico: sai sabendo o que estudar hoje.</p></section>
<section class="blk">{ficha(A, today)}</section>
<p class="src">Datas das provas: calendário divulgado pela OAB e FGV. Regra de matrícula conforme o edital de cada edição; confirme sempre no edital oficial.</p>
</body></html>"""
