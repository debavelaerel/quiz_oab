# Quiz OAB (Método VDE) — design

Data: 2026-09-30 · Status: v2 implementada; v3 (§10) e v3.1 (§11) implementadas; **v4 (§12, admin no padrão do Tribunais) aguardando revisão**

## 1. Objetivo

Funil de quiz do Método VDE para a 1ª fase da OAB. A pessoa responde ~2 min, descobre qual
prova de 2027 (OAB 48/49/50) e qual turma são ideais, deixa o contato e recebe um
**diagnóstico em PDF**. O lead cai num banco, o PDF é gerado sozinho em background e existe um
painel admin para o comercial.

Substitui o fluxo manual da entrega original (`reference/qual-a-oab-dev/`, site estático mais
CLI Python em que o consultor colava um código `QO1...`). Essa pasta é **só referência** e não
é editada.

Sucesso do primeiro marco: tudo roda **local de ponta a ponta**, os testes de regra passam, e o
devops consegue subir na AWS só com os Dockerfiles, o `.env.example` e o README. O Supabase de
produção é criado depois, com as migrations do repo.

### Fora do escopo agora
Página de analytics do admin (os dados já são gravados), apresentação comercial, deploy real na
AWS, projeto Supabase real, bucket S3 real, provedor de e-mail real, exclusão de lead pelo admin.

### Terminologia
O produto se chama **diagnóstico** (não "laudo") em copy, rotas, colunas e nomes de serviço. O
texto visível do pacote de referência já diz "Diagnóstico"; "laudo" aparece só em
docstrings e comentários, que não são tocados.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Frontend | Reescrita em React/Next.js (`Quiz.tsx`) |
| Regra de recomendação | **Reaproveita o `logic.js` original sem edição** (copiado por script) + `logic.d.ts`. Não é reescrita em TS |
| Fluxo das perguntas | `fluxo.ts` novo, extraído do script do `index.src.html` (`ORDER`, `aplica`, `saida`, `proxima`) |
| Persistência | Gravação a cada passo (snapshot completo com número de sequência) |
| Sessão | Anônima, `session_token` no `localStorage`; contato só no fim; uma linha por tentativa |
| Ligação entre tentativas | `email_normalizado` e `whatsapp_normalizado` indexados, **sem unique** |
| Data de referência | Do **servidor** (America/Sao_Paulo), fixada no `start`. Override `?hoje=` só com `ALLOW_HOJE_OVERRIDE=1` |
| Diagnóstico em PDF | Microserviço Python (FastAPI) em volta do pacote `diagnosis/` de referência |
| Entrega do PDF ao lead | E-mail com link quando o PDF fica pronto + botão "Baixar meu diagnóstico" na tela de resultado. Isolado em um ponto único, para trocar depois |
| Identificação no WhatsApp | Mensagem sem o código `QO1`, com uma **referência curta** (`#K7F2`) que localiza o lead no admin |
| Tráfego pago | Eventos de `dataLayer` do original e colunas `utm_*` entram no MVP |
| Admin | MVP enxuto: login, lista com filtros e CSV, detalhe com diagnóstico |
| Ambiente | Local: Supabase CLI, MinIO (S3), Mailpit (e-mail), serviço Python em Docker, Next em dev |

## 3. Arquitetura

```
Navegador (Quiz React)
   │  POST start / answer / finish   (JSON)
   ▼
Next.js (Node, container) ── Supabase (Postgres)
   │  after(): dispara o diagnóstico sem atrasar a resposta
   ▼
services/diagnostico-pdf (FastAPI + Chromium) ── S3 (MinIO local)
   │
   └─ ao ficar pronto, o Next envia o e-mail (SMTP; Mailpit local)
```

### 3.1 Módulo compartilhado `lib/oab/`
Roda no navegador e no servidor.

- `logic.js` e `data.json`: **copiados de `reference/qual-a-oab-dev/_build/` por
  `scripts/sync-oab.mjs`**, nunca editados à mão. `logic.d.ts` descreve os tipos.
- `fluxo.ts`: fluxo das perguntas e regras de validação. Exporta `aplica`, `proxima`, `saida`,
  `opcoesValidas(campo, respostas, hoje)` e a regra de limpeza de respostas que deixam de se
  aplicar. Reproduz o que o original esconde da UI: `periodo` 6–10 só com `regime=sem`,
  `trava=denovo` só com `tentativa=reprov`, `rotina=nada` exclusiva, ordem canônica das
  múltiplas respostas. O `teste` só é aceito se não houver saída antecipada.
- `codigo.ts`: montagem e parse do código `QO1.<campos>.<AAAAMMDD>` (ordem fixa de
  `data.json > campos`). O código é interno (coluna `codigo` e entrada do serviço Python); o
  lead não o vê.

### 3.2 Uma única fonte para `data.json`
As datas das turmas mudam com frequência, e o pacote Python lê `_build/data.json` e `assets/`
por caminho relativo (`diagnosis/data.py`, `assets.py`). Por isso:

- `scripts/sync-oab.mjs` copia a fonte para `lib/oab/` e para
  `services/diagnostico-pdf/vendor/` (mantendo o layout `_build/data.json` e `assets/`).
- Um teste compara o hash das três cópias.
- Em runtime, o Next envia ao serviço `{codigo, nome, data_hash, recomendacao: {tipo, exame,
  turma}}`. O serviço recalcula, e responde **409** se o hash não bater ou se a recomendação
  divergir. O PDF nunca indica uma turma diferente da que a tela mostrou.

### 3.3 Next.js
- `components/Quiz.tsx`: máquina de estados com todas as telas do `index.src.html`: intro,
  perguntas (título e dica dinâmicos, inclusive `inscrito`), parte 2 com vídeo, teste
  (t0–t4), dados, resultado com prévia borrada, resultado `sem_prova`, `cedo`, `f2`. A barra de
  progresso reproduz `totalPassos`. Reaproveita `Button`, `OptionButton`, `ProgressBar`,
  `Header` do molde do Tribunais onde servir.
- `track()` do original portado: eventos `quiz_start`, `quiz_answer`, `quiz_teste`,
  `quiz_lead`, `quiz_result`, `quiz_whatsapp`, `quiz_instagram` no `dataLayer`.
- `app/api/quiz/{start,answer,finish,result,whatsapp}`
- `app/api/diagnostico/[token]`: link estável (redireciona para o S3).
- `app/api/admin/{login,logout,export}` e `app/api/admin/leads/[token]/{pdf,reenviar-email}`.
- `app/admin/`: login, lista de leads, detalhe do lead.
- `lib/server/`: `quizService`, `sessionRepo` + `supabaseSessionRepo`, `diagnosticoService`,
  `diagnosticoBackground`, `email` (interface + SMTP), `s3`, `adminAuth`, `rateLimit`, `csv`,
  `ip`, `uuid`, `supabaseAdmin`.
- `lib/validacao.ts`, `lib/mascara.ts`, `lib/normalize.ts`.
- Toda rota roda em `runtime = 'nodejs'`. Fronteira JSON em `snake_case`, código interno em
  `camelCase`.

### 3.4 Microserviço `services/diagnostico-pdf`
- `POST /diagnostico`: usa `answers.from_code` e `report.build_html` do pacote `diagnosis/`
  (copiado sem edição, nunca `pdf.py`); renderiza com Playwright-Python no padrão do
  `render.py` do Tribunais; sobe para o S3 e devolve a chave em `X-Diagnostico-S3-Key`.
- **Sem Node**: o `pdf.py` original depende de Node e de `html2pdf.mjs` e não é importado pelo
  caminho `build_html`. A imagem fica só Python 3.12 mais Chromium.
- Autenticado por `X-Diagnostico-Secret`; falha fechada se o segredo não estiver configurado.
- **S3 reescrito** em relação ao molde do Tribunais, que não serve para IAM role nem MinIO:
  `configurado()` depende só de `BUCKET_NAME`; `ACCESS_KEY` e `SECRET_KEY` são opcionais (sem
  elas, o SDK usa a IAM role); `S3_ENDPOINT` e path-style para MinIO. O mesmo vale para
  `lib/server/s3.ts` no Next.
- No ambiente local há dois endpoints: o Python (Docker) sobe em `minio:9000`, e a URL
  assinada entregue ao navegador usa `localhost:9000` (`S3_PUBLIC_ENDPOINT`). Isso vai no
  `.env.example`.

## 4. Banco de dados

Uma tabela, `quiz_sessions`, uma linha por **tentativa**. RLS ligado **sem policy pública**; só
a `service_role` acessa. Migrations em `supabase/migrations/`, nome `AAAAMMDDHHMMSS_*.sql`.

| Grupo | Colunas |
|---|---|
| Identidade | `id`, `session_token` uuid (anônimo, no navegador), `diagnostico_token` uuid fixo (link do PDF), `ref_curta` text **unique** (4 caracteres, alfabeto sem ambíguos; gerada com retry) |
| Estado | `status` (`em_andamento`, `concluido`, `saiu`), `saida_tipo` (`cedo`, `f2` ou nulo), `ultima_pergunta` (id da pergunta ou `t0`–`t4`), `seq` int (último snapshot aceito) |
| Respostas | `respostas` jsonb (19 campos de pergunta, com `vezes`), `teste` jsonb (5 letras A–D ou X) |
| Contato | `nome_completo`, `nome`, `email`, `whatsapp`, `email_normalizado`, `whatsapp_normalizado` (indexados) |
| Consentimento | `consentimento_em`, `consentimento_versao` (versão do texto de `privacidadeTxt`) |
| Origem | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` (capturados no `start`) |
| Resultado | `hoje` date, `codigo`, `recomendacao` jsonb, `tipo`, `exame`, `turma` (colunas para filtro) |
| Sinal comercial | `whatsapp_clicado_em` |
| Diagnóstico | `diagnostico_status`, `diagnostico_solicitado_em`, `diagnostico_pdf_s3_key`, `diagnostico_pdf_erro` |
| E-mail | `email_enviado_em`, `email_erro` |
| Tempo | `started_at`, `updated_at` (trigger), `completed_at` |

`diagnostico_status`: `nao_se_aplica` (tipos `cedo`, `f2`, `sem_prova`), `pendente`, `pronto`,
`erro`, `desligado` (S3 não configurado). Recebem diagnóstico apenas os tipos `ok`, `acima` e
`sem_turma`.

## 5. Fluxo de dados

1. **`POST /api/quiz/start`** `{session_token?, utm}`: se vier um `session_token` de uma sessão
   **`em_andamento` do mesmo dia (data de São Paulo do servidor)**, devolve o snapshot salvo para
   retomar. Caso contrário, cria a linha, fixa `hoje` e grava as UTMs. Devolve `session_token`,
   `hoje` e o snapshot. Sessões `concluido` ou `saiu` nunca são retomadas.
2. **`POST /api/quiz/answer`** `{session_token, seq, respostas, teste}`: snapshot completo.
   - Só grava se `seq` for maior que o `seq` salvo (uma requisição atrasada não apaga uma mais
     nova) e se a sessão não estiver `concluido`.
   - Valida com `fluxo.opcoesValidas` e aplica a regra de limpeza.
   - Atualiza `ultima_pergunta` e recalcula `status` (`saiu` com `saida_tipo` se houver
     saída; volta a `em_andamento` se a pessoa voltou e mudou a resposta).
3. **`POST /api/quiz/finish`** `{session_token, respostas, teste, contato, consentimento}`:
   valida e normaliza o contato, **recalcula a recomendação no servidor** com o `hoje` da
   sessão, monta o `codigo`, e faz **uma atualização atômica**
   (`UPDATE … SET status='concluido' … WHERE session_token=$1 AND status<>'concluido'
   RETURNING *`). Só quem de fato mudou o status agenda o `after()`; um duplo clique ou retry
   devolve o mesmo resultado sem gerar outro PDF.
4. **Diagnóstico em background** (`after()`): grava `diagnostico_status = pendente` e
   `diagnostico_solicitado_em`, chama o serviço Python, grava a chave (`pronto`) ou o erro
   (`erro`). Se o S3 não estiver configurado, `desligado`. Em `pronto`, envia o e-mail.
   Um `pendente` com mais de 10 minutos é tratado como `erro` na leitura, porque um deploy ou
   scale-in do container pode matar o trabalho em andamento.
5. **`GET /api/quiz/result?session_token=`** devolve recomendação, `diagnostico_status` e, se
   `pronto`, o link `/api/diagnostico/<diagnostico_token>`. **Nunca devolve e-mail nem WhatsApp.**
   O cliente consulta a cada ~3 s por até ~60 s para mostrar o botão "Baixar meu diagnóstico".
6. **`POST /api/quiz/whatsapp`** grava o primeiro clique (fire-and-forget).
7. **`GET /api/diagnostico/[token]`**: 302 para URL assinada do S3 (5 min); **425** se
   `pendente`; 404 se `nao_se_aplica`; 503 se `desligado`. Resposta com `Cache-Control:
   no-store` e `X-Robots-Tag: noindex`. O link é público e sem validade (quem tem o link vê o
   PDF, que tem dados pessoais); isso fica documentado.

### Mensagem do WhatsApp
Texto curto com o nome, a prova e turma recomendadas e a referência curta (ex.: `#K7F2`), sem o
código `QO1` e sem dados sensíveis. Há um texto próprio para `sem_prova`. O restante das
respostas (rotina, trava, motivo, teste, investimento) o consultor vê no detalhe do lead no
admin, buscando pela referência, pelo nome ou pelo WhatsApp normalizado; o admin agrupa as
tentativas da mesma pessoa e destaca a última concluída.

### Entrega do PDF ao lead
`lib/server/email.ts` expõe uma interface `enviarDiagnostico(lead, link)`, com
implementação SMTP (nodemailer; `SMTP_*` no `.env`). Local: Mailpit. Produção: o devops
aponta para o SMTP do provedor escolhido (por exemplo o SES). O e-mail leva o link estável do
diagnóstico. Falha de envio vai para `email_erro` e nunca quebra o fluxo; o admin tem
"Reenviar e-mail". Trocar o canal depois (só WhatsApp, por exemplo) mexe só nesse módulo.

## 6. Erros e segurança

- **O quiz nunca trava por falha de infra.** `answer` e `whatsapp` são fire-and-forget no
  cliente; o `finish` reenvia tudo.
- **Falha no diagnóstico:** `diagnostico_status = erro` e `diagnostico_pdf_erro`, sem propagar
  ao usuário. O admin tem "Regenerar" para `erro` e para `pendente` antigo.
- **Validação no servidor** por `fluxo.opcoesValidas`; e-mail e DDD válidos; `teste` com 5 letras
  de A a D ou X.
- **Banco** só pela `service_role`, sem policy pública.
- **Rate limit** em memória por IP nas rotas de escrita, inclusive `start` (que cria linhas
  anônimas). Com várias instâncias na AWS é preciso um limite compartilhado. Além disso, o
  `ip.ts` usa o último valor do `X-Forwarded-For`, o que só funciona com o ALB direto; atrás de
  um CloudFront todos compartilhariam o mesmo limite. Notas no README para o devops.
- **Admin:** senha única e cookie HMAC, protegido por `middleware.ts`.
- **Tokens separados:** `diagnostico_token` e `session_token` não se substituem.
- **Credenciais AWS:** IAM role por padrão; chaves explícitas só como fallback local.
- **`after()`** funciona em servidor Node de longa duração. Um reinício do container durante
  a geração perde o trabalho em voo; isso é coberto pelo tratamento de `pendente` antigo e
  pelo "Regenerar", e fica documentado para o devops.
- **Consentimento:** implícito ("Ao continuar…"), como no original; gravamos o momento e a
  versão do texto.

## 7. Testes

- **Vitest, regra de recomendação** (`logic.js` copiado) contra os 104 casos de
  `casos-de-teste.json`, nos campos que ela produz: `tipo`, `exame`, `turma`, `atalho`, `quando`,
  `pergunta_inscricao`, `recebe_laudo`. (`turma_anual`, `avisos`, `argumentos` e `teste` vêm do
  Python.)
- **Vitest, `fluxo.ts`**: perguntas que aparecem, saídas `cedo` e `f2`, opções válidas, limpeza
  de respostas, botão voltar.
- **pytest no serviço**: os 80 casos que recebem diagnóstico geram HTML sem exceção, com os
  campos `avisos`, `argumentos` e `teste` esperados, e os 5 exemplos batem com `exemplos/`.
- **Paridade JS × Python**: o `check.py` de referência roda sem edição (o Python é copiado
  sem edição e o `logic.js` também).
- **Sincronia de dados:** teste do hash das três cópias do `data.json`.
- **Serviços e rotas** com repositório em memória: `finish` concorrente (um só PDF), `answer`
  atrasado (`seq`), `answer` após `finish`, retomada, estados de `diagnostico_status`, resultado
  sem dados pessoais.
- **Visual:** validação manual no navegador, mais um teste ponta a ponta (Playwright) do
  caminho feliz.

## 8. Ambiente local e entrega ao devops

- `docker compose`: MinIO, Mailpit e o serviço Python. Supabase local via `supabase start`. Next
  em `npm run dev`.
- Entregas: `Dockerfile` do Next em modo `standalone`, `Dockerfile` do serviço Python,
  `.env.example` completo (Next e Python, incluindo `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`,
  `SMTP_*`, `ALLOW_HOJE_OVERRIDE`), README com os passos e as notas de rate limit, `after()` e
  link público.
- Entrega para o Supabase de produção: pasta `supabase/migrations/`.

## 9. Riscos e pendências

- **Identidade visual:** reproduzir as telas do `index.src.html` (Poppins, Degular nos números,
  logos de `assets/`). Não há guia de marca separado; o `DESIGN.md` do Tribunais é de outra
  marca e não se aplica.
- **Pendências do VDE (placeholders no `CONFIG`):** número do WhatsApp, URL da política de
  privacidade, vídeo da parte 2, remetente e provedor de e-mail. O quiz roda sem eles.
- **Serviço AWS** para o Next e para o Python: decisão do devops.
- **Retenção e exclusão de dados (LGPD):** sem política definida e sem exclusão de lead pelo
  admin no MVP; precisa ser tratado antes de produção.
- **O que a mensagem limpa deixa de mandar ao comercial:** rotina, trava, motivo, teste e
  investimento, que o original enviava no texto. Agora estão só no admin; o VDE precisa
  aprovar.

## 10. Revisão v3 (2026-10-01) — nome primeiro, formulário enxuto, novo pacote do VDE

Esta seção **substitui** o que contradiz as seções anteriores (§3.3 tela `dados`, §4 colunas de nome, §5.3 corpo do
`finish`, §6 validação de nome). O resto continua valendo.

### 10.1 Nome é a primeira informação
- Nova tela **"Como podemos te chamar?"** logo depois do botão da intro e antes da primeira pergunta: selo "Antes de
  começar", título, uma linha de apoio ("Assim a gente deixa o quiz com a sua cara."), **um** campo e o botão "Começar o quiz →".
- O campo é o **primeiro nome ou apelido**: aparado, 2 a 80 caracteres, ao menos 2 letras. **Não** exige sobrenome.
- O nome vai no **snapshot** do `answer` (`nome`, junto de `respostas` e `teste`) e é gravado em `quiz_sessions.nome`
  desde o início. O `start` devolve `nome` quando retoma a sessão. `nome_completo` deixa de ser coletado: a coluna fica
  (sem migration) e fica `null` nas sessões novas; o admin e o CSV mostram `nome`.
- O `finish` passa a receber `contato: { email, whatsapp }` + `consentimento`; o nome vem da sessão. Sem nome na sessão
  → 422 com `campos: ['nome']`. O corpo do `finish` também pode trazer `nome`; quando válido, vale sobre o já gravado na sessão (o `finish` reenvia respostas e teste do cliente pelo mesmo motivo); sem nome no corpo, vale o da sessão. A tela volta ao passo do nome com o que já foi digitado.
- Compatibilidade temporária: cliente anterior à v3 que envia `contato.nome_completo`; pode ser removida depois do deploy (precedência: `nome` do corpo válido > nome da sessão > primeira palavra de `contato.nome_completo` > 422 `['nome']`).
- O diagnóstico em PDF, a mensagem do WhatsApp (`montarMensagemWhatsApp`), o admin e o e-mail usam esse `nome`.

### 10.2 O nome aparece em 5 pontos do quiz
A fonte de verdade das perguntas continua sendo o `data.json` copiado da referência (não editado). As variações com o
nome vivem numa tabela de **substituições de título na camada de UI** (`components/quiz/copy.ts`), por id de pergunta; se
não houver nome, vale o título original.
1. `situacao`: "Pra começar, {nome}: como está a sua faculdade de Direito hoje?"
2. `nivel`: "{nome}, com sinceridade: como está a sua base pra prova da OAB?"
3. `motivo`: "E agora a mais importante, {nome}: por que você quer passar na OAB?"
4. `compromisso`: "{nome}, o quanto você topa mudar na sua rotina pra passar?"
5. Tela final (contato): "{nome}, deixe seu e-mail e WhatsApp pra receber o seu resultado"
O nome é sempre exibido como texto (React escapa); nunca como HTML.

### 10.3 Formulários no estilo do `vicio_quiz` (cores do OAB)
Vale para a tela do nome e para a tela final de contato; o resto do quiz continua fiel ao original.
- Campo: padding 12px 14px, borda 1px (`--lil2`), raio 12px, fonte 14.5px, foco com borda `--roxo` e anel de 3px a 8%.
- **Sem rótulo visível**: só placeholder; o `<label>` continua no HTML como `sr-only`.
- Espaço: título → primeiro campo 24px (28px na tela do nome, com um campo); entre campos 10px; campo → botão 20px;
  erro 12.5px, 6px abaixo do campo; botão amarelo e texto de privacidade como hoje.
- Tela de contato: **WhatsApp primeiro, e-mail depois**. Placeholders `(11) 91234-5678` e `Seu melhor e-mail`. Teclado
  `tel` e `email`. Máscara `formatarWhatsapp`: o campo guarda e envia o texto mascarado; o servidor valida (só dígitos contam) e normaliza para `whatsapp_normalizado`, como antes da v3. Erros só depois do blur
  ("WhatsApp inválido. Use o formato (11) 91234-5678." / "E-mail inválido."). Botão desabilitado até os dois serem válidos.
- Fora do escopo agora: **gravação antecipada do contato** ao sair do campo (o Tribunais faz); o lead continua só sendo
  concluído no clique final. Fica como possível melhoria, decisão do comercial.

### 10.4 Novo pacote de referência do VDE (zip de 30/09/2026)
Conteúdo atualizado, **sem mudança na regra**: `logic.js` e `logic.py` idênticos. Mudaram `data.json` (datas das turmas
confirmadas em 30/09; `inicio2`; flags `aConfirmar` e `fimVendasAConfirmar`), `diagnosis/report.py`, `_build/index.src.html`
(uma linha do cartão do resultado), `casos-de-teste.json` (13 dos 104 casos com resultado diferente), `README.md`,
`ENTREGA-DEV.md` e os exemplos/HTML gerados.
- A pasta `reference/qual-a-oab-dev` é **substituída pela nova entrega** (é a fonte de verdade do VDE; a regra "não editar"
  vale para nós). Depois `npm run sync:oab` atualiza `lib/oab/data.json`, o hash, e a cópia do pacote Python do serviço.
- Regras de exibição (do `report.py` / `index.src.html`): turma com `aConfirmar` **nunca** mostra data ("Data a
  confirmar" / "início: data a confirmar"); turma com `inicio2` mostra "DD/MM ou DD/MM"; `fimVendasAConfirmar` mostra "a
  partir de DD/MM". As datas internas dessas turmas servem só para a lógica decidir se há matrícula e **não podem
  vazar** para o lead. Portar a mesma regra para `components/quiz/resultado.ts` e `telas/Previa.tsx`.
- Os 104 casos de teste, os testes de hash e o pytest do serviço (80 diagnósticos + 5 exemplos byte a byte) passam a
  usar os arquivos novos; quem divergir é o sinal de que algo ficou para trás.

### 10.5 Testes e verificação desta revisão
- Vitest: `copy.ts` (substituição com e sem nome), validação do nome, `finish` sem `nome_completo` (422 sem nome na
  sessão), snapshot com `nome`, regras de exibição de data (a confirmar / dois cronogramas; "a partir de" vale só para o PDF, no `report.py` do VDE, que o quiz não renderiza).
- Playwright e2e atualizado: tela do nome → perguntas com o nome → contato (WhatsApp, e-mail) → resultado.
- Verificação manual no navegador: tela do nome, uma pergunta com o nome, formulário final (mobile 390px e desktop),
  comparando com a maquete aprovada; sem regressão visual no resto do quiz.

## 11. Revisão v3.1 (2026-10-01) — tela final sem botões; sem e-mail automático

Substitui o que contradiz §3.3 (tela `resultado`), §5.4-5.7 (mensagem do WhatsApp, e-mail, botão de download) e §2.
- **Tela final:** mostra o resultado em destaque ("{nome}, a OAB da sua aprovação é a 48", prazo, turma), o box do
  diagnóstico, a **prévia desfocada** com o cadeado "Chega no seu WhatsApp" (agora um bloco, não um link) e um aviso:
  "Nossa equipe vai te enviar o seu resultado no WhatsApp". **Não há** botão de WhatsApp nem de download, nem consulta
  periódica do PDF. Para quem não tem prova possível (`sem_prova`): "Nossa equipe vai te enviar uma orientação para a sua
  próxima prova no seu WhatsApp".
- **E-mail:** o diagnóstico **não** é mais enviado por e-mail ao lead (o job de segundo plano só gera e guarda o PDF). O botão
  "Reenviar e-mail" do admin continua, de uso manual do time. O time baixa o PDF no admin e envia pelo WhatsApp.
- **Código removido:** `linkWhatsApp`, `montarMensagemWhatsApp`, `consultarDiagnostico`/`vistaDiagnostico`, `api.result` e
  `api.whatsapp` do cliente, `CONFIG.whatsapp` e `NEXT_PUBLIC_WHATSAPP` (não é mais preciso informar o número do WhatsApp).
  Os endpoints `/api/quiz/result` e `/api/quiz/whatsapp` permanecem no servidor sem uso pelo quiz.
- **Eventos de analytics:** `quiz_whatsapp` e `quiz_download` deixam de existir.

## 12. Revisão v4 (2026-10-02) — admin com as funcionalidades do Tribunais, adaptado ao OAB

Fonte de comparação: `reference/tribunais-patterns` (admin, `components/admin/*`, `lib/analytics.ts`). Visual: `DESIGN.md` do OAB
e `components/admin/ui.tsx`. Ícones: `lucide-react` (dependência nova). Desenho aprovado pelo usuário em 2026-10-02.

### 12.1 Navegação e lista de leads
- Menu: **Leads** e **Analytics**, com ícones (`Users`, `PieChart`).
- Lista: busca (ref, nome, e-mail, WhatsApp), filtros tipo, prova, status e **diagnóstico** (novo), CSV, selos de estado com bolinha
  (`Pill`), paginação. Colunas: Nome+e-mail, Resultado (tipo, prova·turma), **Teste (X de 5)**, Status, Diagnóstico, **Origem** (`utm_source`),
  Início. Sai a coluna/uso de "clicou no WhatsApp" (o botão não existe mais).

### 12.2 Detalhe do lead
- Topo: voltar; nome; selos (status, resultado, diagnóstico); ações: **Baixar PDF** (primário), **Regenerar**, **Reenviar e-mail**, e
  **Abrir no WhatsApp** (`https://wa.me/<whatsapp do lead>?text=<mensagem pronta>`; a mensagem cita o nome, a prova e leva o link estável do
  PDF `${APP_URL}/api/diagnostico/<token>`).
- Cartões (só borda): Contato (inclui consentimento e datas), Origem (UTM, só se houver), Resultado (tipo, prova, turma, atalho, saída),
  Perfil do lead (respostas com rótulo legível em grade de 2 colunas), **Teste questão a questão** (✓/✗, disciplina, resposta e gabarito,
  total X de 5), **Links para o CRM** (campo copiável: PDF estável), Outras tentativas.
- **Diagnóstico completo:** seção abaixo dos cartões com o diagnóstico formatado, **idêntico ao PDF**, embutido num `iframe` com
  `sandbox` e `srcdoc`, em moldura de página. O serviço Python ganha `POST /diagnostico/html` (mesma autenticação e mesmas validações
  de `/diagnostico`; devolve `text/html` de `report.build_html`, sem Chromium). O Next busca esse HTML no servidor ao abrir a página;
  se o serviço estiver fora do ar ou o hash divergir, a seção mostra um aviso e o resto da página funciona. Nenhum texto do diagnóstico é
  duplicado no app: o pacote do VDE continua sendo a única fonte.

### 12.3 Analytics (`/admin/analytics`)
- Seletor de período: **tudo / 30 dias / 7 dias** (`?periodo=`).
- Indicadores (6): sessões iniciadas, taxa de conclusão, concluídas, média de acertos, diagnósticos prontos (%), tempo médio até concluir.
- Sessões por dia (sparkline); **funil**: iniciou → terminou as perguntas → fez o teste → deixou o contato (concluiu) → diagnóstico gerado.
- **Onde desistem:** sessões `em_andamento`/`saiu` por `ultima_pergunta` (barras ordenadas).
- Resultados: por tipo (`ok/acima/sem_turma/sem_prova`), por prova (48/49/50), por turma (dias) e saídas antecipadas (`cedo/f2`).
- Perfil das respostas: uma distribuição por pergunta (situação, regime/período, tentativa, nível, horas, trabalho, trava, motivo,
  compromisso, investir/parcela), rótulos do `data.json`.
- Teste: distribuição de acertos (0–5) e questões mais erradas. Origem: por `utm_source` e `utm_campaign`, com conversão (concluídas/iniciadas).
- **Prioridade comercial:** segmentos (prova recomendada × compromisso × disposição de investir) com contagem de concluídos.
- Agregações em funções puras (`lib/adminAnalytics.ts`), testadas; leitura de até 5000 sessões em páginas pelo repositório.
  Gráficos portados do Tribunais com os tokens do OAB: `Sparkline`, `Funnel`, `PieChart`, `RankedBars`, `CampoCopiavel`.

### 12.4 Fora do escopo
Apresentação comercial, leads desqualificados (o OAB não pede contato de quem sai antes), "clique no WhatsApp", exclusão de lead (LGPD
pendente), usuários individuais.

### 12.5 Testes e verificação
Vitest para as agregações, para o gerador da mensagem do WhatsApp e para a leitura paginada; pytest para `/diagnostico/html` (401, 409
de hash/recomendação, 422, HTML dos casos de teste); telas por verificação manual no navegador (desktop 1280 e celular 390) e e2e
existente continua passando.
