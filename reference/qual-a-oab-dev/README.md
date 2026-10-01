# Qual a OAB da sua aprovação em 2027?

Quiz funil do Método VDE (1ª fase): a pessoa responde em uns 2 minutos e descobre qual prova de 2027 (OAB 48, 49 ou 50) é a ideal pra ela. Na tela final aparece só um resumo com a prova. O diagnóstico completo chega em PDF pelo WhatsApp, gerado pelo time a partir do código que vai na mensagem.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O quiz pronto e autocontido (fontes e logo embutidos). É o que vai pro ar. |
| `_build/data.json` | **Fonte única**: provas, turmas, horas por turma, regra do 9º período, perguntas e opções. |
| `_build/logic.js` | A regra de recomendação usada no quiz. |
| `_build/index.src.html` | As telas do quiz. `CONFIG` no topo: WhatsApp, Instagram, endpoint de leads. |
| `diagnosis/` | Gerador do laudo em Python (`logic.py` espelha o `logic.js`, `report.py` tem toda a copy do laudo). |
| `exemplos/` | Laudos de exemplo. |

Depois de qualquer mudança:

```
python3 _build/build.py     # regera o index.html
python3 _build/check.py     # compara quiz x laudo em ~92 mil casos; precisa passar
```

## Gerar o laudo de um lead

O consultor cola a mensagem que chegou no WhatsApp:

```
python3 -m diagnosis "Oi! Fiz o quiz ... QO1.cursando.sem.8.dia.-.-.b1.-.zero.h3.estagio.insta.20260929" --nome "Maria"
```

O PDF sai em `laudos/`. `--html` gera só o HTML.

## A regra

1. **Que provas ele pode fazer.** Bacharel pode fazer as três. Estudante precisa estar matriculado no 9º período (ou no 5º ano, se o curso for anual) até o prazo de cada edição: 30/06/2027 pra OAB 48, 30/12/2027 pra 49 e 30/06/2028 pra 50. Contando um período por semestre a partir do 2º semestre de 2026: 8º período em diante libera a 48, o 7º libera a 49 e o 6º libera a 50. Do 5º pra trás, o quiz acaba numa tela de agradecimento ("a sua OAB vem a partir de 2028").
2. **Inscrição.** A prova sai da lista quando a inscrição fecha. Se o lead ainda pode fazer uma prova cuja inscrição já fechou, o quiz pergunta se ele se inscreveu.
3. **Turma.** Todas as turmas preparam do zero, então só contam o tempo até a prova e as horas por dia. Entre as provas liberadas, vale a primeira que tem uma turma VDE ainda com matrícula que cabe nas horas por dia dele; entre essas, a mais longa. Se nenhuma cabe, indica a mais leve disponível, com alerta no laudo ("acima").
4. **Nível.** Não entra na recomendação, só no texto do laudo. Quem nunca fez a prova se autoavalia; quem já reprovou informa os pontos da última 1ª fase.
5. **Quem já passou na 1ª fase** sai do quiz com uma mensagem de agradecimento.
6. **Rotina (pro comercial).** Trabalho (só estudo, estágio, meio período de 4h, integral de 8h, horário variável) e o que mais divide o tempo (filhos, família, casa, outros compromissos; múltipla escolha). Vai numa linha legível na mensagem do WhatsApp, na ficha e no bloco "A sua rotina" do laudo. Não muda a recomendação.
7. **O que mais trava (pro comercial).** Múltipla escolha: prova, matéria, materiais, rotina, tempo, faculdade esquecida, erro por detalhe, medo da reprovação, nervosismo e, só pra quem reprovou, medo de repetir. Vai na mensagem do WhatsApp ("O que mais me trava: ...") e ganha um quadro próprio no laudo.
8. **O porquê (pro comercial).** "Por que você quer passar na OAB?" (múltipla escolha) e "O quanto você topa mudar na sua rotina pra passar?" (mede o querer: o que for preciso, bastante, um pouco, ainda decidindo). Vão na mensagem do WhatsApp e abrem o laudo no quadro "O seu porquê".
9. **Investimento (só pro comercial).** "O Método VDE já aprovou mais de 110 mil pessoas. Pra investir numa preparação assim, o que funciona pra você?" (não é problema, parcela, só à vista sem cartão, limite apertado, desconto, nada agora). Quem escolhe parcela responde a faixa (até R$ 50, 50 a 80, 80 a 120, mais de 120). Vai na mensagem do WhatsApp e **fica fora do laudo**.

## Formulário de contato

Depois do teste, antes do resultado, entra "O seu diagnóstico está pronto" com **nome, e-mail e WhatsApp** (máscara `(85) 90000-0000`, validação de e-mail e de DDD). O resultado só aparece depois disso. E-mail e telefone **não** vão no código nem na mensagem do WhatsApp: saem pelo `CONFIG.leadEndpoint` junto com todas as respostas. **Enquanto o endpoint estiver vazio, esses contatos não são gravados em lugar nenhum.** Texto de consentimento em `CONFIG.privacidadeTxt`; link da política em `CONFIG.privacidadeUrl` (vazio).

## Argumentos do VDE no laudo

Cada resposta do quiz ganha um quadro "Você respondeu: ..." com o argumento do VDE 1ª fase, na seção "Como o VDE 1ª fase resolve cada ponto do seu diagnóstico". As travas vêm primeiro e em destaque. Os erros do teste ganham, além do sinal, a linha "No VDE, ...". Copy em `diagnosis/argumentos.py`; pra revisar tudo de uma vez, `python3 _build/build-argumentos.py` gera `respostas-diagnostico.md`.

Regras de copy dela: quem reprovou leva dados oficiais da FGV (Exame de Ordem em Números, vol. IV, 2020: ~70% de quem faz a 1ª fase já fez antes, 60% dos aprovados precisaram de mais de uma tentativa, taxa de aprovação cai com as tentativas); método sempre volta pro Método VDE; tempo nunca é "pouco": menos horas por dia = começar mais cedo. Fatos do produto: manual de marca VDE 1ª fase (maio/2026). Datas das turmas aparecem como **previstas, a confirmar**.

## Parte 2: teste de nível

Depois do nome entra a tela "Parte 2 de 2" com o vídeo da Ana Clara (`CONFIG.videoParte2Src`, roteiro em `roteiro-video.md`) e, em seguida, 5 questões oficiais, uma por tela, com opção "Não sei responder". Estão em `data.json` (`teste`), com o texto do caderno Tipo 1 e o gabarito **definitivo** da FGV:

| Disciplina | Prova | Gabarito |
|---|---|---|
| Ética | OAB 45, questão 3 | C |
| Constitucional | OAB 46, questão 12 | B |
| Trabalho | OAB 46, questão 73 | A |
| Penal | OAB 45, questão 59 | D |
| Processo Civil | OAB 46, questão 55 | A |

A OAB 47 ficou de fora porque, em 29/09/2026, só tinha gabarito preliminar (o definitivo sai em 05/10/2026). A tela final mostra só a nota ("teste: 4 de 5") e uma **prévia desfocada do laudo** (turma indicada, o que os erros dizem, correção), com títulos legíveis, conteúdo em blur e cadeado que leva ao WhatsApp; a correção comentada, com o artigo de cada questão, fica no laudo. As respostas vão no fim do código (`CBAXA`, X = não sabe) e a nota vai legível na mensagem do WhatsApp. O teste não muda a prova recomendada.

**O que cada erro sinaliza** (regra da Ana Clara, em `data.json` > `teste` > `sinal`), com o peso de cada disciplina em `pesos`:

- **Ética:** o sinal mais sério. É a disciplina que mais vale (8 questões) e aparece em destaque, primeiro.
- **Constitucional:** dificuldade em direito público (Tributário, Administrativo, Direitos Humanos e Filosofia), 20 questões.
- **Processo Civil:** dificuldade em todos os processos (Processo Penal e Processo do Trabalho), 17 questões.
- **Penal:** dificuldade também em Processo Penal, 12 questões.
- **Trabalho:** dificuldade em Processo do Trabalho e Previdenciário, 12 questões.

O laudo soma as disciplinas ligadas aos erros, sem contar duas vezes a mesma ("25 das 80 questões pedem atenção"). "Não sei" conta como erro. Na mensagem do WhatsApp vai "acertei 3 de 5 (errei Ética e Processo Civil)".

Horas por turma (Ana Clara, 29/09/2026): 180 e 150 dias, 2h de seg a sex; 120 dias, 2h30 de seg a sáb; 90 dias, 3h; 60 dias, 3h30; 40 dias, 4h sem folga. Datas das turmas: `calendario/_build/events.py`. Inícios confirmados por ela em 30/09/2026 (150D OAB 49 e 40D OAB 48 com 2 cronogramas, `inicio2`); vendas confirmadas até o 180D OAB 50 (menos o fim dele); **as demais vendas ainda a confirmar**. O `data.json` vale sobre o calendário.

## Pendências

- `CONFIG.whatsapp` é placeholder (`5500000000000`); `CONFIG.leadEndpoint` vazio.
- O deck da 120D OAB 48 fala em "2h por dia de segunda a sábado"; aqui está 2h30, como ela passou.
- Pra testar em outra data: `index.html?hoje=2027-02-10`.
