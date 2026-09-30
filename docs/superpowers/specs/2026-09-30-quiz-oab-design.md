# Quiz OAB (Método VDE) — design

Data: 2026-09-30 · Status: aguardando revisão

## 1. Objetivo

Funil de quiz do Método VDE para a 1ª fase da OAB. A pessoa responde ~2 min, descobre qual
prova de 2027 (OAB 48/49/50) e qual turma são ideais, deixa o contato e recebe um
**diagnóstico em PDF**. O lead cai num banco, o PDF é gerado sozinho em background e existe um
painel admin para o comercial.

Substitui o fluxo manual da entrega original (`reference/qual-a-oab-dev/`, site estático mais
CLI Python em que o consultor colava um código `QO1...`). Essa pasta é **só referência** e não
é editada.

Sucesso do primeiro marco: tudo roda **local de ponta a ponta**, os 104 casos de
`casos-de-teste.json` passam, e o devops consegue subir na AWS só com o Dockerfile,
o `.env.example` e o README. O Supabase de produção é criado depois, com as migrations do repo.

### Fora do escopo agora
Analytics do admin (funil e abandono por pergunta — os dados já são gravados), apresentação
comercial, deploy real na AWS, projeto Supabase real, bucket S3 real.

### Terminologia
O produto se chama **diagnóstico** (não "laudo") em copy, rotas, colunas e nomes de serviço.
O pacote de referência usa "laudo"/`diagnosis`; o texto visível ao usuário é ajustado ao portar.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Frontend | Reescrita em React/Next.js (`Quiz.tsx`), com `data.json` e a lógica como módulo compartilhado |
| Persistência | Gravação a cada passo (snapshot completo), não um único POST no fim |
| Sessão | Anônima, `session_token` no `localStorage`; contato só no fim; uma linha por tentativa |
| Ligação entre tentativas | `email_normalizado` e `whatsapp_normalizado` indexados, **sem unique** |
| Data de referência | Do **servidor** (fuso America/Sao_Paulo), fixada no `start`. `?hoje=AAAA-MM-DD` só fora de produção |
| Diagnóstico em PDF | Microserviço Python (FastAPI) em volta do pacote `diagnosis/` de referência |
| Admin | MVP enxuto: login, lista com filtros e CSV, detalhe com diagnóstico |
| Ambiente | Local: Supabase CLI, MinIO (S3), serviço Python em Docker, Next em dev |
| Mensagem do WhatsApp | Limpa, **sem** o código `QO1`; o consultor identifica o lead pelo admin |

## 3. Arquitetura

```
Navegador (Quiz React)
   │  POST start / answer / finish   (JSON)
   ▼
Next.js (Node, container) ── Supabase (Postgres)
   │  after(): dispara o diagnóstico sem atrasar a resposta
   ▼
services/diagnostico-pdf (FastAPI + Chromium) ── S3 (MinIO local)
```

### 3.1 Módulo compartilhado `lib/oab/`
TypeScript puro, sem React nem servidor; roda no navegador e no servidor.

- `data.json`: cópia da entrega (perguntas, provas, turmas, regra).
- `logic.ts`: porte de `_build/logic.js` (`recomendar`, `cedo` etc.).
- `fluxo.ts`: **extraído do script do `index.src.html`**, onde hoje vivem `ORDER`, `aplica()`,
  `saida()` e `proxima()`. Define quais perguntas aparecem e quando o quiz termina cedo
  (`cedo`, `f2`). O servidor usa o mesmo módulo para validar as respostas.
- `codigo.ts`: montagem e parse do código `QO1.<campos>.<AAAAMMDD>` (ordem fixa de
  `data.json > campos`).

### 3.2 Next.js
- `components/Quiz.tsx`: máquina de estados com as telas do `index.src.html` (intro, perguntas,
  parte 2 com vídeo, teste de 5 questões, dados, resultado, `cedo`, `f2`). Reaproveita
  `Button`, `OptionButton`, `ProgressBar`, `Header` do molde do Tribunais onde servir.
- `app/api/quiz/{start,answer,finish,result,whatsapp}`
- `app/api/diagnostico/[token]`: link estável (redireciona para o S3).
- `app/api/admin/{login,logout,export}` e `app/api/admin/leads/[token]/pdf`.
- `app/admin/`: login, lista de leads, detalhe do lead.
- `lib/server/`: `quizService`, `sessionRepo` (interface) e `supabaseSessionRepo`,
  `diagnosticoService` (cliente HTTP do Python), `diagnosticoBackground`, `s3` (endpoint
  configurável), `adminAuth`, `rateLimit`, `csv`, `ip`, `uuid`, `supabaseAdmin`.
- `lib/validacao.ts`, `lib/mascara.ts`, `lib/normalize.ts`: e-mail, DDD, máscara de telefone
  e normalização para ligar tentativas.
- Toda rota roda em `runtime = 'nodejs'`. Fronteira JSON em `snake_case`, código interno em
  `camelCase`.

### 3.3 Microserviço `services/diagnostico-pdf`
- `POST /diagnostico`: recebe `codigo` (`QO1...`), `nome` e `diagnostico_token`; usa
  **apenas `build_html`** do pacote `diagnosis/` (copiado sem edição); renderiza o PDF com
  Playwright-Python no padrão do `render.py` do Tribunais; sobe para o S3 e devolve a chave
  no header `X-Diagnostico-S3-Key`.
- **Sem Node**: o `diagnosis/pdf.py` original depende de Node e de `html2pdf.mjs` e não é usado.
  A imagem fica só Python 3.12 mais Chromium.
- Autenticado pelo header `X-Diagnostico-Secret`; falha fechada se o segredo não estiver
  configurado.
- Bucket ausente = "recurso não ligado", não erro.

## 4. Banco de dados

Uma tabela, `quiz_sessions`, uma linha por **tentativa**. RLS ligado **sem policy pública**; só
a `service_role` acessa. Migrations em `supabase/migrations/`, nome `AAAAMMDDHHMMSS_*.sql`.

| Grupo | Colunas |
|---|---|
| Identidade | `id`, `session_token` uuid (anônimo, no navegador), `diagnostico_token` uuid fixo (link do admin e do CRM) |
| Estado | `status` (`em_andamento`, `concluido`, `saiu`), `saida_tipo` (`cedo`, `f2` ou nulo), `ultima_pergunta` |
| Respostas | `respostas` jsonb (19 campos de pergunta, com `vezes`), `teste` jsonb (5 letras A–D ou X) |
| Contato | `nome_completo`, `nome`, `email`, `whatsapp`, `email_normalizado`, `whatsapp_normalizado` (indexados) |
| Consentimento | `consentimento_em` (aceite do texto de privacidade) |
| Resultado | `hoje` date, `codigo`, `recomendacao` jsonb, `tipo`, `exame`, `turma` (colunas para filtro) |
| Sinal comercial | `whatsapp_clicado_em` |
| Diagnóstico | `diagnostico_status` (`nao_se_aplica`, `pendente`, `pronto`, `erro`), `diagnostico_pdf_s3_key`, `diagnostico_pdf_erro` |
| Tempo | `started_at`, `updated_at` (trigger), `completed_at` |

`diagnostico_status` distingue "não se aplica" (`cedo`, `f2`, `sem_prova`) de "erro". Recebem
diagnóstico apenas os tipos `ok`, `acima` e `sem_turma` (80 dos 104 casos de teste).

## 5. Fluxo de dados

1. **`POST /api/quiz/start`** cria a linha, fixa `hoje` (servidor, São Paulo) e devolve
   `session_token` e `hoje`. O navegador só retoma uma sessão guardada se ela for do próprio dia;
   uma sessão de outro dia é descartada e começa outra.
2. **`POST /api/quiz/answer`** `{session_token, respostas, teste}`: **snapshot completo** que
   substitui o anterior. Valida campos e valores contra `data.json` e o fluxo, atualiza
   `ultima_pergunta` e recalcula `status` (`saiu` com `saida_tipo` se houver saída; volta a
   `em_andamento` se a pessoa voltou e mudou a resposta). Idempotente e tolerante a requisições
   perdidas; o botão "voltar" não deixa valor antigo.
3. **`POST /api/quiz/finish`** `{session_token, respostas, teste, contato, consentimento}`:
   valida e normaliza o contato, **recalcula a recomendação no servidor** com `hoje` da sessão,
   monta o `codigo`, marca `concluido` e define `diagnostico_status`. Se couber diagnóstico,
   dispara `after()` que chama o microserviço. Idempotente: chamar de novo numa sessão concluída
   devolve o mesmo resultado, sem regerar nem duplicar.
4. **`GET /api/quiz/result`** devolve a recomendação para a tela final.
5. **`POST /api/quiz/whatsapp`** grava o primeiro clique (fire-and-forget).
6. **`GET /api/diagnostico/[token]`**: 302 para URL assinada do S3 (5 min); **425** enquanto o
   PDF não existe; 404 se `nao_se_aplica`.

### Mensagem do WhatsApp
Texto curto e limpo, com o nome e a prova e turma recomendadas, **sem** o código `QO1`. O número
de destino vem do `CONFIG`. O consultor identifica o lead pelo nome e pelo WhatsApp informado no
formulário, no admin.

## 6. Erros e segurança

- **O quiz nunca trava por falha de infra.** `answer` e `whatsapp` são fire-and-forget no
  cliente; o `finish` reenvia tudo, então perda de requisições no meio não corrompe o lead.
- **Falha no diagnóstico:** vai para `diagnostico_pdf_erro` e `diagnostico_status = erro`, sem
  propagar ao usuário. O admin tem o botão "Regenerar".
- **Validação no servidor:** campo e valor existem em `data.json` e respeitam o fluxo; e-mail e
  DDD válidos; `teste` com 5 letras de A a D ou X.
- **Banco** só pela `service_role`, sem policy pública.
- **Rate limit** em memória por IP nas rotas de escrita (molde `rateLimit.ts`). Com várias
  instâncias na AWS é preciso um limite compartilhado (nota no README para o devops).
- **Admin:** senha única e cookie HMAC, protegido por `middleware.ts`.
- **Tokens separados:** `diagnostico_token` (link do PDF) e `session_token` (sessão do quiz)
  não se substituem.
- **Credenciais AWS:** o SDK resolve por IAM role por padrão; `ACCESS_KEY` e `SECRET_KEY` só como
  fallback local.
- **`after()`** funciona em servidor Node de longa duração (container). O risco é só em ambiente
  serverless; documentado no README.

## 7. Testes

- **Vitest, `logic.ts`** contra os 104 casos de `casos-de-teste.json`.
- **Testes próprios do `fluxo.ts`** (perguntas que aparecem, saídas `cedo` e `f2`, botão voltar),
  porque os 104 casos não cobrem essa parte.
- **Paridade** TS × JS × Python: manter o `check.py` (~92 mil combinações) com `logic.ts` como
  terceiro motor.
- **Serviços e rotas** com repositório em memória: saída antecipada, idempotência do `finish`,
  snapshot com "voltar", validação, estados de `diagnostico_status`.
- **Visual:** validação manual no navegador, mais um teste ponta a ponta (Playwright) do
  caminho feliz.

## 8. Ambiente local e entrega ao devops

- `docker compose`: MinIO e o serviço Python. Supabase local via `supabase start`. Next em
  `npm run dev`.
- Entregas para o devops: `Dockerfile` do Next em modo `standalone`, `Dockerfile` do serviço
  Python, `.env.example` completo (Next e Python), README com os passos e as notas de
  rate limit e `after()`.
- Entrega para o Supabase de produção: pasta `supabase/migrations/`.

## 9. Riscos e pendências

- **Identidade visual:** reproduzir as telas do `index.src.html` (Poppins, Degular nos números,
  logos de `assets/`). Não há guia de marca separado; o `DESIGN.md` do Tribunais é de outra
  marca e não se aplica.
- **Pendências do VDE (placeholders no `CONFIG`):** número do WhatsApp, URL da política de
  privacidade, vídeo da parte 2. O quiz roda sem eles.
- **Serviço AWS** para o Next e para o Python: decisão do devops.
- **Copy "laudo" → "diagnóstico"** precisa ser revisada ao portar os textos do pacote de
  referência.
