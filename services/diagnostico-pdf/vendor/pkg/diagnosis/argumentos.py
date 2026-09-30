"""How the VDE 1ª fase answers each quiz answer. All copy the laudo uses in
"Como o VDE 1ª fase resolve cada ponto do seu diagnóstico" lives here.

Product facts come from the brand manual (manual-marca-metodo-vde-1fase, May/2026):
the five daily steps, the platform tools, 3.000+ commented questions, legislative
notebooks, 10+ simulados, scheduled reviews with mind maps and human support.
_build/build-argumentos.py turns this file into respostas-diagnostico.md for review.

Each entry: (title, text). Missing value = no card for that answer.
"""

ARG = {
    "situacao": {
        "cursando": ("Faculdade e OAB ao mesmo tempo",
                     "No VDE o cronograma se encaixa na sua rotina, não o contrário. A meta do dia já vem pronta na plataforma, com a disciplina e o tema, então você não perde tempo decidindo o que estudar entre uma aula e outra."),
        "formado": ("Voltar a estudar depois da faculdade",
                    "Os resumos estratégicos foram escritos pra quem está há tempo longe dos livros: linguagem simples, tabelas, esquemas e exemplos práticos. Mesmo quem se formou há dez anos entende de primeira."),
    },
    "grade": {
        "atraso": ("Grade fora do lugar",
                   "Antes de tudo, confirme o seu período com a coordenação. Na conversa com o time do VDE, o plano é montado em cima da prova que você realmente pode fazer, pra você não se preparar pra uma edição errada."),
        "naosei": ("Confirmar o seu período",
                   "Vale confirmar com a coordenação em qual período está a sua matrícula. Na conversa com o time do VDE, o plano é montado em cima da prova que você realmente pode fazer."),
    },
    "tentativa": {
        "nunca": ("Primeira vez na OAB",
                  "Na primeira prova, o que mais pesa é não saber por onde começar. No VDE isso já está resolvido: o cronograma diz o que estudar todos os dias até a prova, com os temas escolhidos a partir do histórico de cobrança da FGV."),
        "reprov": ("Reprovar não é o fim da linha",
                   "Você não é exceção: segundo a FGV, a cada edição cerca de 70% de quem faz a 1ª fase já fez a prova antes, e 60% dos aprovados precisaram de mais de uma tentativa. Mas a própria FGV mostra que a taxa de aprovação cai conforme as tentativas aumentam. Por isso a próxima prova não pode ser igual à última: o que muda é o método. No VDE, a Gestão de Estudos mostra desde a primeira semana o seu aproveitamento por tema e disciplina, e você enxerga exatamente onde estavam os pontos que faltaram."),
    },
    "pontos": {
        "p0": ("Refazer a base com método",
               "Com menos de 30 pontos, o caminho é reconstruir a base. As turmas do VDE começam do zero e seguem a mesma ordem em todo tema: resumo, questões, lei seca e, só se precisar, videoaula."),
        "p1": ("Organizar o que você já sabe",
               "De 30 a 35 pontos, a base existe, mas está solta. O cronograma do VDE junta tudo numa ordem, com dias de revisão programados e mapas mentais pra fixar o que já foi estudado."),
        "p2": ("Buscar os pontos que faltam",
               "De 36 a 39, faltam poucos acertos, e eles costumam estar nas disciplinas menores e na revisão. As turmas longas do VDE cobrem 15 disciplinas e reservam dias só pra revisar."),
    },
    "nivel": {
        "b0": ("Começar do zero sem medo",
               "Todas as turmas do VDE partem do zero. Os resumos foram feitos pra quem não lembra da faculdade, e a videoaula fica à mão pra quando um tema não entrar de primeira."),
        "b1": ("Do básico às questões",
               "O seu ponto de virada é o treino. São mais de 4.000 questões comentadas alternativa por alternativa, incluindo questões de concurso, que são mais difíceis que as da OAB e te deixam acima da média."),
        "b2": ("Transformar base em pontos",
               "Com base boa, o que decide é constância e treino de prova. São mais de 10 simulados no padrão FGV pra treinar tempo, concentração e resistência nas 5 horas de prova."),
    },
    "metodo": {
        "zero": ("Já começar do jeito certo",
                 "Você não tem vício de estudo pra desfazer, e isso é uma vantagem. O Método VDE é ativo e tem cinco passos, sempre na mesma ordem: ver a meta do dia no cronograma, ler o resumo estratégico, resolver questões, ler a lei seca nos Cadernos Legislativos e, só se precisar, assistir à videoaula. Primeiro entende, depois pratica, depois aprofunda."),
        "resumo": ("Do resumo próprio pro método",
                   "Fazer o próprio resumo consome o tempo que devia ir pras questões, e a prova cobra reconhecer a regra na alternativa, não copiar. No Método VDE o resumo estratégico já vem pronto, atualizado a cada prova, com tabelas, esquemas e as pegadinhas da FGV. Você lê, parte direto pras questões e fecha o tema com a lei seca."),
        "video": ("Da videoaula pro método ativo",
                  "Videoaula longa dá sensação de estudo, mas é passiva: você entende na hora e esquece na semana seguinte. No Método VDE a aula é o quinto passo, facultativo, em blocos de 30 a 40 minutos. O centro do estudo são as questões e a lei seca, e é isso que faz o conteúdo ficar na cabeça."),
        "questoes": ("Das questões soltas pro método completo",
                     "Resolver questão é essencial, mas sem teoria organizada você acerta pela memória e erra quando a banca troca o jeito de perguntar. No Método VDE a questão vem depois do resumo do tema e antes da lei seca, e cada uma é comentada alternativa por alternativa. Assim o erro vira aprendizado, não repetição."),
        "solto": ("Do estudo solto pro cronograma",
                  "Sem cronograma, o natural é ficar nas matérias preferidas e empurrar as que pesam. No Método VDE você não decide nada: o cronograma dia a dia equilibra o peso das disciplinas e a importância de cada tema, com revisões e simulados marcados até a prova. A sua única missão é sentar e estudar."),
    },
    "trava": {
        "prova": ("Você vai saber exatamente o que priorizar",
                  "A 1ª fase tem 80 questões, você passa com 40 e não existe nota mínima por disciplina: o jogo é somar pontos onde mais cai. O cronograma do VDE já vem montado assim, a partir do histórico de cobrança da FGV, equilibrando o peso de cada disciplina e a importância de cada tema. Se um tema está no cronograma, é porque cai. Você não precisa estudar o edital inteiro nem adivinhar por onde ir."),
        "materia": ("Muita matéria vira uma meta por dia",
                    "Quem estuda tudo, não estuda nada. No VDE a matéria chega em partes do tamanho certo: nas turmas longas é uma disciplina por dia, com um resumo estratégico que traz só o que a FGV cobra. Os dias de revisão já estão marcados no cronograma, com mapas mentais, pra nada do que você estudou se perder no caminho."),
        "materiais": ("O VDE entrega tudo, você só estuda",
                      "Não precisa garimpar PDF, comprar livro nem montar material. Na plataforma do VDE está tudo, organizado por tema: resumos estratégicos atualizados a cada prova, Cadernos Legislativos (que substituem o Vade Mecum na 1ª fase), mais de 4.000 questões comentadas, mapas mentais, mais de 250 videoaulas curtas e mais de 10 simulados. E cada material aparece no dia certo do cronograma."),
        "rotina": ("Uma rotina que se sustenta sozinha",
                   "Rotina não é força de vontade, é plano. No VDE você abre a plataforma e a meta do dia está lá, com disciplina, tema e questões. O cronômetro registra as suas horas, a Gestão de Estudos mostra a sua evolução e a comunidade da turma estuda junto com você. Quando você sabe o que fazer e vê o progresso, parar fica muito mais difícil do que continuar."),
        "tempo": ("A sua rotina define quando começar",
                  "O que define a sua preparação não é quantas horas você tem, é quando você começa. Quanto menos horas por dia, mais cedo você começa, e é pra isso que existem as turmas longas: a de 180 dias pede 2h por dia, com cerca de 15 questões e o fim de semana livre. No VDE a vida do aluno é o ponto de partida: o cronograma se encaixa na sua rotina, não o contrário."),
        "esqueci": ("Todo mundo começa do mesmo lugar",
                    "Quase todo mundo chega na OAB sem lembrar boa parte da faculdade, e as turmas do VDE partem do zero por isso. Os resumos estratégicos foram escritos pra quem está há tempo longe dos livros: linguagem simples, tabelas, esquemas e muitos exemplos. Se um tema não entrar de primeira, a videoaula curta do professor da disciplina resolve a dúvida, e o suporte do time tira o resto."),
        "questao": ("O detalhe passa a jogar a seu favor",
                    "Quem erra por detalhe geralmente sabe a matéria, mas não a letra da lei, e na FGV as alternativas parecidas se decidem no texto do artigo. No VDE a lei seca é um passo obrigatório de todo tema: os Cadernos Legislativos trazem só os artigos e súmulas que caem e dizem em quais provas cada um já foi cobrado. E todas as questões são comentadas alternativa por alternativa, pra você entender também por que as erradas estão erradas."),
        "reprovacao": ("O medo diminui quando você mede o progresso",
                       "O índice de reprovação assusta porque parece sorte, e não é. No VDE você acompanha o seu desempenho a prova toda: a Gestão de Estudos mostra o aproveitamento por disciplina e tema, e os mais de 10 simulados no padrão FGV mostram, bem antes do dia, se você já passa dos 40 pontos. Você chega na prova sabendo onde está, não torcendo."),
        "nervoso": ("Treino difícil, jogo fácil",
                    "O nervosismo vem do desconhecido, e simulado é o antídoto. No VDE são mais de 10 simulados nas condições reais da prova, pra treinar as 5 horas, o tempo por questão e a concentração até o fim. O banco ainda traz questões de concurso, mais difíceis que as da OAB. Quando o dia chegar, você já fez essa prova várias vezes."),
        "denovo": ("Desta vez, com outro caminho",
                   "O medo de repetir é justo: quem volta pra prova do mesmo jeito tende a ter o mesmo resultado. No VDE a preparação é outra do primeiro ao último dia: método ativo, cronograma fechado até a prova, Gestão de Estudos apontando os seus pontos fracos, simulados pra medir a evolução e suporte humanizado pra tirar dúvida de conteúdo durante todo o curso."),
    },
    "motivo": {
        "ciclo": ("Fechar o ciclo sem perder tempo",
                  "Pra resolver a OAB e seguir os seus planos, o VDE é objetivo: só o que cai, com cronograma fechado até a data da prova."),
        "orgulho": ("Esse orgulho vem com constância",
                    "Ninguém faz esse caminho só: o time do VDE e os colegas de turma estão na plataforma com você, do primeiro dia até o resultado."),
        "advocacia": ("O primeiro passo da sua carreira",
                      "A carteira é a porta de entrada da advocacia, e cada dia de cronograma cumprido é um passo concreto até ela."),
        "concursos": ("Treino que já serve pros concursos",
                      "O banco de questões do VDE inclui questões de concurso, mais difíceis que as da OAB. Você já treina no nível que vai encontrar depois, e o VDE Concursos segue a mesma metodologia."),
        "mudar": ("Mudar de vida começa com um plano",
                  "A turma indicada tem data de início e cronograma até a prova. A partir daí, é seguir a meta de cada dia."),
        "provar": ("A resposta está no seu desempenho",
                   "Você acompanha a sua evolução de perto na Gestão de Estudos e nos simulados. Quando a prova chegar, você já sabe que consegue."),
        "adiei": ("Não existe mais depois",
                  "A turma tem data pra começar e o cronograma leva você, dia a dia, até a prova. A decisão que falta é só a de começar."),
        "emprego": ("A carteira sem largar o trabalho",
                    "O cronograma se encaixa na rotina de quem trabalha, e as turmas longas pedem 2h por dia."),
    },
    "compromisso": {
        "tudo": ("Disposição com direção",
                 "Com essa disposição, o que falta é direção. O VDE entrega o plano pronto, e a sua energia vai toda pro estudo."),
        "bastante": ("Um espaço fixo no seu dia",
                     "Abrir um espaço fixo no dia é o que a turma pede. O resto, o VDE organiza."),
        "pouco": ("A sua vida é o ponto de partida",
                  "É exatamente a lógica do VDE: o cronograma se encaixa na sua rotina, e não o contrário. Por isso existe turma de 2h por dia."),
        "decidindo": ("Decidir com segurança",
                      "Na conversa, o time do VDE te mostra a plataforma por dentro e o plano pra sua prova. Você decide vendo o caminho inteiro."),
    },
    "trabalho": {
        "nao": ("Tempo livre com direção",
                "Com mais tempo livre, o risco é a dispersão. A meta exata do dia e o cronômetro da plataforma te mostram se o dia rendeu."),
        "estagio": ("Estágio e estudo no mesmo dia",
                    "Com a meta pronta, você aproveita o horário que sobra do estágio sem gastar energia planejando. Uma disciplina por dia nas turmas longas."),
        "meio": ("Um turno pro trabalho, um bloco pro estudo",
                 "Trabalhando meio período, dá pra cumprir a meta do dia num bloco firme no turno livre, sem invadir a noite."),
        "integral": ("Rotina cheia também passa",
                     "A turma de 180 dias foi pensada pra quem tem a rotina cheia: 2h por dia, uma disciplina por dia e fim de semana livre."),
        "variavel": ("Escala que muda, meta que não muda",
                     "Com horário variável, a meta do dia está sempre pronta na plataforma. Você estuda no horário que tiver, sem precisar replanejar a semana."),
    },
    "rotina": {
        "filhos": ("Estudar com filhos em casa",
                   "A própria Ana Clara, criadora do método, é mãe e sabe como é dividir o dia. A meta diária do VDE cabe num bloco fixo, cedo ou depois que as crianças dormem."),
        "familia": ("Um horário só seu",
                    "Cuidando de alguém, o estudo não pode depender de improviso. Com a meta pronta, é só abrir a plataforma no horário que você reservou."),
        "casa": ("Cada minuto conta",
                 "Com a casa pra cuidar, o VDE não te faz perder tempo: videoaulas curtas, de 30 a 40 minutos, e só quando você precisa."),
        "outros": ("Estudo com hora marcada",
                   "Os seus compromissos já estão na agenda, e o estudo entra também. O cronograma tem descanso programado e respeita a sua semana."),
    },
    "horas": {
        "h15": ("Menos horas por dia, mais antecedência",
                "Com menos de 2h por dia, a estratégia é começar com mais antecedência. A turma de 180 dias é a que tem mais tempo até a prova: 2h de segunda a sexta, cerca de 15 questões por dia e fim de semana livre. Organizar a semana pra chegar nessas 2h é o primeiro passo do seu plano."),
        "h2": ("2h por dia, com antecedência",
               "Com 2h por dia, a sua aliada é a antecedência. As turmas de 180 e 150 dias foram feitas exatamente pra esse ritmo: uma disciplina por dia e tempo de sobra até a prova."),
        "h25": ("2h30 por dia, no ritmo certo",
                "Com 2h30 por dia, você cabe desde a turma de 120 dias até as mais longas. Quanto antes começar, mais calma é a preparação."),
        "h3": ("3h por dia: o ritmo da turma de 90 dias",
               "Com 3h por dia você acompanha a turma de 90 dias, o mesmo tempo que a própria Ana Clara usou pra se preparar pra OAB. E, se começar antes, pode escolher uma turma ainda mais tranquila."),
        "h35": ("3h30 por dia: quase todas as turmas cabem pra você",
                "Com 3h30 por dia você cabe em quase todas as turmas. A escolha passa a ser de antecedência: quanto antes começar, mais revisão cabe antes da prova."),
        "h4": ("4h por dia: você escolhe a turma",
               "Com 4h ou mais por dia, qualquer turma cabe na sua rotina, inclusive a de 40 dias da reta final. Começando antes, esse tempo extra vira revisão e simulado."),
    },
    "vde": {
        "nao": ("Muito prazer, VDE",
                "O VDE nasceu em 2015 do perfil da Ana Clara, que passou na OAB 25 com o método que depois virou o Método VDE. Hoje ele reúne cronograma, materiais, questões, simulados e suporte numa plataforma própria."),
        "insta": ("Do Instagram pra turma",
                  "Você já conhece o jeito VDE de falar de OAB. Na turma, é o método completo: cronograma, materiais, questões comentadas, simulados e suporte."),
        "gratis": ("Do material gratuito pro método completo",
                   "O material gratuito é uma amostra. Na turma, você tem o cronograma até a prova, todos os materiais, o banco de questões, os simulados e o suporte do time."),
        "aluno": ("De volta ao VDE",
                  "Você já sabe como a plataforma funciona. O que muda agora é a turma certa pra sua prova e pra sua rotina."),
    },
}

# Order of the cards in the laudo: the order the lead answered.
ORDEM = ["situacao", "grade", "tentativa", "pontos", "nivel", "metodo", "trava", "motivo",
         "compromisso", "trabalho", "rotina", "horas", "vde"]

# What the VDE offers for each area the test flagged.
TESTE_VDE = {
    "etica": "No VDE, Ética tem resumo próprio, caderno legislativo com Estatuto, Regulamento Geral e Código de Ética e questões comentadas. E o cronograma dá a ela o peso que ela tem na prova: é a disciplina que mais pontua.",
    "constitucional": "No VDE, cada disciplina de direito público tem resumo, caderno legislativo, questões comentadas e videoaula com professor especialista, e o cronograma distribui as cinco pelo peso de cada uma na prova.",
    "processo_civil": "No VDE, os três processos seguem a mesma ordem: resumo, questões e lei seca. Os Cadernos Legislativos mostram quais artigos do CPC, do CPP e da CLT já caíram, e em quais provas.",
    "penal": "No VDE, Penal e Processo Penal têm resumos com as pegadinhas da FGV, cadernos legislativos com os artigos que caem e questões comentadas alternativa por alternativa.",
    "trabalho": "No VDE, Trabalho, Processo do Trabalho e Previdenciário entram no cronograma com resumo, lei seca selecionada e questões comentadas, pra você somar pontos nas três de uma vez.",
}


def menos_2h(rec, dias, horas_txt):
    """Under 2h a day the lead gets the turma with the most time left that is still for sale.
    When the 180-day turma already closed, the copy names the one that is actually offered."""
    if dias == 180:
        return None
    return (f"Com menos de 2h por dia, a estratégia é começar com mais antecedência. Pra {rec}, a turma de {dias} dias "
            f"é a de mais antecedência que ainda tem matrícula: {horas_txt} por dia. "
            f"Organizar a semana pra chegar nessas {horas_txt} é o primeiro passo do seu plano.")


def _oferta(campo, v, texto, oferta):
    """Cards that name the long turmas must name the one actually offered when those already closed.
    oferta: (prova, dias, horas_txt) of the recommended turma."""
    if not oferta:
        return texto
    prova, dias, h = oferta
    if campo == "horas" and v == "h15":
        return menos_2h(prova, dias, h) or texto
    if campo == "horas" and v == "h2" and dias not in (180, 150):
        return (f"Com 2h por dia, a sua aliada é a antecedência. Pra {prova}, a turma de mais antecedência que ainda tem matrícula "
                f"é a de {dias} dias, com {h} por dia. Encaixar esse tempo na sua semana é o primeiro passo do seu plano.")
    if dias == 180:
        return texto
    if campo == "trava" and v == "tempo":
        return texto.replace("a de 180 dias pede 2h por dia, com cerca de 15 questões e o fim de semana livre",
                             f"pra {prova}, a de mais antecedência que ainda tem matrícula é a de {dias} dias, com {h} por dia")
    if campo == "trabalho" and v == "integral":
        return (f"Com a rotina cheia, vale a turma de mais antecedência que ainda tem matrícula: pra {prova}, "
                f"a de {dias} dias, com {h} por dia e a meta pronta na plataforma.")
    return texto


def cards(A, oferta=None):
    """(campo, valor, título, texto) for every answer that has an argument.
    oferta: (prova, dias, horas_txt) of the recommended turma (see _oferta)."""
    out = []
    for campo in ORDEM:
        for v in (A.get(campo) or "").split("+"):
            arg = ARG.get(campo, {}).get(v)
            if arg:
                out.append((campo, v, arg[0], _oferta(campo, v, arg[1], oferta)))
    return out
