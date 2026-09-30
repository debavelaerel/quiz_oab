# Qual a OAB da sua aprovação em 2027? · o que o desenvolvedor precisa

Este documento explica como o funil funciona e o que falta ligar. Junto com o `_build/data.json`, o
`_build/logic.js` e o `casos-de-teste.json`, dá pra colocar o quiz no ar e implementar o laudo em
qualquer linguagem sem abrir o Python.

## O que o funil faz

1. **O quiz** (`index.html`) é uma página só, autocontida (fontes, logo e dados embutidos). Faz as
   perguntas, o teste de 5 questões e o formulário de contato. No fim, mostra a prova recomendada e manda a
   pessoa pro WhatsApp.
2. A mensagem do WhatsApp termina com um código, `QO1....`, que carrega todas as respostas.
3. **O laudo** é um PDF A4 gerado a partir desse código, que o consultor devolve na conversa.

O quiz já está pronto: falta hospedar e preencher o `CONFIG`. O laudo já roda em Python
(`python3 -m diagnosis "<mensagem>" --nome X`); o dev decide se usa como está ou se porta.

## O que vem na entrega

| Arquivo | O que é |
|---|---|
| `index.html` | O quiz pronto pra subir. Gerado de `_build/index.src.html` por `python3 _build/build.py`. |
| `_build/data.json` | **Fonte única**: provas, datas, turmas, rotinas, regra do 9º período, perguntas, opções, teste, pesos. |
| `_build/logic.js` | A regra de recomendação, em JS puro (roda no navegador e no Node). |
| `_build/index.src.html` | As telas do quiz, com o `CONFIG` no topo. |
| `diagnosis/` | Implementação de referência do laudo, em Python. `report.py` e `argumentos.py` têm toda a copy. |
| `casos-de-teste.json` | 104 leads com o resultado esperado (5 exemplos com nome + 99 gerados cobrindo todas as saídas). |
| `exemplos/` | Os 5 exemplos em PDF e em HTML, pra comparar o resultado visual. |
| `resultados-quiz.html` / `.md` | Leitura humana: que combinação de respostas gera cada resultado final, com a copy. |
| `respostas-diagnostico.md` | Leitura humana: o argumento do laudo pra cada resposta do quiz. |
| `assets/` | Fontes (Poppins + Degular só em números) e logos. |

A fonte de verdade é o Python + `data.json`. `casos-de-teste.json`, `resultados-quiz.*`,
`respostas-diagnostico.md` e `index.html` são gerados; **não edite à mão**. Mudou data ou turma: edite só
o `data.json` e rode `build.py` e `check.py`.

## O que ligar no quiz (`CONFIG`, em `_build/index.src.html`)

| Chave | Estado | O que é |
|---|---|---|
| `whatsapp` | **placeholder** `5500000000000` | Número dos consultores, só dígitos, com DDI. |
| `leadEndpoint` | **vazio** | URL que recebe o lead por `POST` JSON. **Sem ela, e-mail e telefone não são gravados em lugar nenhum.** |
| `privacidadeUrl` | **vazio** | Link da política de privacidade, abaixo do formulário. |
| `videoParte2Src` | **vazio** | Vídeo vertical da Ana Clara antes do teste (roteiro em `roteiro-video.md`). Vazio = placeholder. |
| `instagram`, `instagramHandle` | ok | Botão das telas de agradecimento. |

Depois de mudar, rode `python3 _build/build.py`.

**Data de referência.** O quiz usa a data do navegador. Pra testar outra data: `index.html?hoje=2027-01-15`.
O funil é perene: a recomendação muda sozinha conforme as matrículas das turmas abrem e fecham
(datas em `data.json > turmas`).

**Payload do `leadEndpoint`** (enviado quando a tela de resultado abre, `keepalive`):

```json
{
  "situacao": "cursando", "regime": "sem", "periodo": "8", "...": "todas as respostas, mesmas chaves do código",
  "nomeCompleto": "Maria Souza", "nome": "Maria", "email": "maria@...", "tel": "(85) 90000-0000",
  "teste": ["C", "B", "A", "X", "A"],
  "hoje": "2026-09-30",
  "codigo": "QO1.cursando.sem.8....20260930",
  "recomendacao": { "tipo": "ok", "exame": "48", "turma": 90 }
}
```

**Eventos no `dataLayer`**: `quiz_start`, `quiz_answer` (`pergunta`, `resposta`), `quiz_teste`, `quiz_lead`,
`quiz_result` (`tipo`, `exame`, `turma`), `quiz_whatsapp`, `quiz_instagram`.

## O código QO1

```
QO1.<20 campos na ordem de data.json > campos>.<AAAAMMDD>
```

Ordem: `situacao, regime, periodo, grade, tentativa, pontos, nivel, inscrito, metodo, horas, trabalho,
vde, rotina, trava, motivo, compromisso, investir, parcela, teste, vezes`.

- `-` = pergunta não mostrada. Múltipla escolha (`rotina`, `trava`, `motivo`) vem junta com `+`.
- `teste` são 5 letras (A a D) na ordem de `data.json > teste`; `X` = "Não sei responder".
- A data no fim é a do dia em que o lead fez o quiz, e é ela que o laudo usa como "hoje".
- **A ordem dos campos não muda.** Campo novo só no fim. Mexer na ordem invalida todo código já enviado,
  e aí o prefixo vira `QO2`.
- `e-mail` e telefone **nunca** entram no código nem na mensagem; só no `leadEndpoint`.

## A regra da recomendação

Está em `logic.js` (`recomendar`), espelhada em `diagnosis/logic.py`. Resumo:

1. **Quem sai antes:** `tentativa = f2` (já passou na 1ª fase) e estudante que não chega no 9º período
   (5º ano, se o curso é anual) a tempo de nenhuma prova → tela de agradecimento, sem laudo.
2. **Provas possíveis:** bacharel faz qualquer uma; estudante precisa estar no 9º período até o `corte` de
   cada edição, contando um período por semestre. Prova cuja inscrição já fechou sai da lista, a não ser que
   o lead responda que se inscreveu (a pergunta `inscrito` só aparece nesse caso).
3. **Turma:** todas preparam do zero, então só contam o tempo até a prova e as horas por dia. Vale a
   primeira prova possível que tenha uma turma **ainda com matrícula** que caiba nas horas do lead; entre
   essas, a mais longa (`ok`). Se nenhuma cabe, a turma com matrícula de mais antecedência (`acima`, com
   aviso de ajuste de rotina). **Turma com matrícula encerrada nunca é indicada:** vai pra próxima disponível.
4. `sem_turma`: há prova possível mas nenhuma turma com matrícula. `sem_prova`: nenhuma prova possível.
5. Nível, teste, método, trava, motivo, trabalho, rotina, VDE e investimento **não mudam** a recomendação,
   só o texto do laudo. Investimento (`investir`, `parcela`) é só pro comercial e fica fora do laudo.
6. `turma_anual`: o comercial oferece a Turma Anual só pra quem vai fazer a OAB 50 (`data.json > anual`).

`_build/check.py` roda `logic.js` e `logic.py` em ~92 mil combinações, de 5 em 5 dias de set/2026 a
out/2027, e falha em qualquer divergência. Se portar a regra, rode os casos de teste.

## O laudo

Seções, na ordem (`diagnosis/report.py > build_html`): capa (prova, dias até a 1ª fase, turma, início
previsto) · O seu porquê · avisos · Por que a OAB X · projeção semestre a semestre (só estudante) · as
provas de 2027 · as turmas do VDE da prova · teste de nível (nota, o que os erros dizem, correção) ·
como o VDE resolve cada resposta · próximo passo (plano de ação) · as respostas do lead.

Toda copy que cita turma nomeia a **turma oferecida**: se a de 180 dias já fechou, o texto fala da que
foi indicada (`argumentos._oferta`, `report.oferta`). Datas de turma aparecem sempre como "previstas".

## Como conferir que está certo

`casos-de-teste.json > casos[]`: para cada caso, leia `codigo` e `hoje`, rode o seu motor e compare com
`esperado`:

| Campo | O que é |
|---|---|
| `tipo` | `ok`, `acima`, `sem_turma`, `sem_prova`, `cedo`, `f2` |
| `exame`, `turma` | Prova e turma indicadas |
| `atalho` | Prova anterior que o lead alcançaria estudando mais horas (`{exame, turma, horas}`) ou `null` |
| `turma_anual` | Se o comercial oferece a Turma Anual |
| `pergunta_inscricao` | Prova sobre a qual o quiz pergunta "Você fez a inscrição?" (ou `null`) |
| `quando` | Só em `cedo`: a partir de quando a OAB libera |
| `recebe_laudo` | Se gera laudo |
| `avisos` | Títulos dos avisos do topo do laudo |
| `argumentos` | `campo:valor` dos quadros "Você respondeu", na ordem |
| `teste` | Acertos, ids das erradas e quantas das 80 questões pedem atenção |

Os 5 primeiros casos têm nome e `laudo_html` (em `exemplos/`), pra comparar o visual.
`logic.js` já passa nos 104: `node` + `require('./_build/logic.js').make(require('./_build/data.json'))`.

## Rodar o laudo de referência

```
python3 -m diagnosis "Oi! ... QO1.formado.-.-.-.nunca....20260930" --nome "Bia"   # PDF em laudos/
python3 -m diagnosis "<mensagem>" --nome "Bia" --html                           # só o HTML
```

Python 3.9+, sem dependências. O PDF precisa de Node + Playwright: rode
`npm install playwright && npx playwright install chromium` na pasta do pacote (ou aponte
`QO_PLAYWRIGHT_DIR` pra uma pasta que já tenha `node_modules/playwright`).

## Ainda pendente do lado do VDE

Número do WhatsApp, `leadEndpoint`, política de privacidade, vídeo da parte 2, preço e acesso da Turma
Anual. As datas das turmas são previsões e mudam no `data.json`.
