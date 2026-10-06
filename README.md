# Quiz OAB (Método VDE)

## 1. O que é

Funil de quiz do Método VDE para a 1ª fase da OAB. A pessoa responde o quiz (~2 a 5 min),
descobre qual prova de 2027 (OAB 48/49/50) e qual turma são ideais para ela, deixa o contato e
vê o resultado na tela (com o diagnóstico desfocado). O time do VDE envia o **diagnóstico em PDF** pelo
WhatsApp da pessoa. O lead fica no banco (Supabase), o PDF é gerado sozinho em segundo plano e o
comercial o baixa no painel `/admin`.

**Vai subir na AWS?** Comece por [`docs/DEPLOY.md`](docs/DEPLOY.md) (checklist do devops). O desenho completo
das decisões está em [`docs/especificacao.md`](docs/especificacao.md).

### Mapa do repositório

| Pasta | O que tem |
| --- | --- |
| `app/` | rotas do Next: quiz `(quiz)/`, API `api/`, painel `admin/` |
| `components/quiz/`, `components/admin/` | telas do quiz e do painel |
| `lib/` | regras (`oab/` = lógica e turmas do VDE), validação, serviços de servidor (`server/`) e analytics do admin |
| `services/diagnostico-pdf/` | serviço Python que gera o PDF (FastAPI + Chromium) |
| `supabase/` | migration, verificação e guia de produção do banco |
| `reference/qual-a-oab-dev/` | **fonte de verdade** do VDE (perguntas, turmas, textos do diagnóstico, casos de teste); não editar à mão |
| `scripts/` | `sync-oab.mjs` (copia a referência para o app) e `gen-quiz-css.mjs` |
| `e2e/` | teste ponta a ponta (Playwright) |
| `docs/` | guia de deploy e especificação |

## 2. Stack e arquitetura

- **Next.js 16** (App Router, Node, `output: 'standalone'`): quiz em React, rotas `/api/quiz/*`,
  `/api/diagnostico/[token]` e o admin (`/admin`, protegido por `proxy.ts`).
- **Supabase (Postgres)**: sessões do quiz / leads (`supabase/migrations/`).
- **`services/diagnostico-pdf`**: FastAPI + Chromium (Playwright para Python), gera o PDF e grava
  no S3. Sem Node na imagem.
- **S3** (MinIO local; na AWS, bucket `vicio-quiz-oab-s3`), **SMTP** opcional (Mailpit local) só para o botão "Reenviar e-mail" do admin.

```
Navegador (Quiz React)
   │  POST start / answer / finish   (JSON)
   ▼
Next.js (Node, container) ── Supabase (Postgres)
   │  after(): dispara o diagnóstico sem atrasar a resposta
   ▼
services/diagnostico-pdf (FastAPI + Chromium) ── S3 (MinIO local)
   │
   └─ o PDF fica no S3; o time baixa pelo /admin e envia pelo WhatsApp (não há e-mail automático ao lead)
```

O link do diagnóstico (`/api/diagnostico/<token>`) responde `302` para uma URL assinada do S3
(5 min de validade da assinatura); `425` enquanto está `pendente`/`erro`, `404` se não existe e
`503` se o serviço/S3 está desligado ou a assinatura falha.

## 3. Rodar local

Pré-requisitos: Node 22, Docker, Supabase CLI (`npx supabase`), Python 3.12 (só para rodar os
testes do serviço fora do Docker).

```bash
npm ci
cp .env.example .env.local            # e preencha (ver abaixo); ponha ALLOW_HOJE_OVERRIDE=1 nele

# 1) Supabase local (portas 643xx — ver nota)
npx supabase start
npx supabase status                   # copie a service_role / "Secret key" para SUPABASE_SERVICE_ROLE_KEY

# 2) MinIO + bucket, Mailpit e o serviço de PDF
docker compose -p quiz-oab --env-file .env.local up -d --build

# 3) Next
npm run dev                           # ou: npx next dev -p 3100 (se a 3000 estiver ocupada)
```

Abra `http://localhost:3000/?hoje=2026-09-30`. O `?hoje=` só funciona com
`ALLOW_HOJE_OVERRIDE=1` no `.env.local` — o `.env.example` traz a variável **vazia** de
propósito (ela nunca pode ir para produção); defina-a só na sua máquina, e também para rodar o
e2e. Endereços locais:

| O quê | URL |
| --- | --- |
| Quiz | `http://localhost:3000` (a porta do `next dev`; ajuste `APP_URL` para ela) |
| Admin | `http://localhost:3000/admin` (senha = `ADMIN_PASSWORD`) |
| Mailpit (e-mails enviados) | `http://localhost:8025` (API: `GET /api/v1/messages`) |
| Console do MinIO | `http://localhost:9001` (minioadmin / minioadmin) |
| Serviço de PDF | `http://localhost:8000/health` |
| Supabase Studio | `http://127.0.0.1:64323` |

Para derrubar: `docker compose -p quiz-oab down -v` (o `-v` apaga também os PDFs do MinIO) e
`npx supabase stop`.

**Portas do Supabase.** O `supabase/config.toml` deste repo desloca as portas do Supabase local
para a faixa **643xx** (API `64321`, banco `64322`, Studio `64323`) em vez do padrão 543xx do CLI,
para conviver com outros projetos Supabase locais na mesma máquina. Por isso o `.env.example`
usa `SUPABASE_URL=http://127.0.0.1:64321`. Se mudar o `config.toml`, mude os dois.

**Portas do compose.** Padrões: MinIO `9000`/`9001`, Mailpit `1025`/`8025`, serviço de PDF `8000`.
Se alguma colidir com outro projeto, mude no `.env.local` (`MINIO_PORT`, `MINIO_CONSOLE_PORT`,
`MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`, `DIAGNOSTICO_PDF_PORT`) e ajuste junto
`S3_ENDPOINT`/`S3_PUBLIC_ENDPOINT`, `SMTP_PORT` e `DIAGNOSTICO_SERVICE_URL`. Passar
`--env-file .env.local` ao compose garante que o `DIAGNOSTICO_SERVICE_SECRET` do serviço é o
mesmo do Next (sem ele, o compose usa `segredo-local`).

**Imagem do MinIO.** `minio/minio` não pode mais ser baixada do Docker Hub e
`quay.io/minio/minio` passou a exigir login (401). O compose usa `cgr.dev/chainguard/minio`
(pública; traz `minio` e `mc` e tem shell, então serve também para o contêiner `minio-init`
que cria o bucket `diagnosticos-oab`).

### Testes

```bash
npx vitest run                         # testes do Next / regras
npx tsc --noEmit
(cd services/diagnostico-pdf && python3 -m venv .venv && . .venv/bin/activate \
  && pip install -r requirements.txt && pytest -q)

# E2E do caminho feliz: precisa do stack de pé (Supabase + compose) e do .env.local
# com ALLOW_HOJE_OVERRIDE=1 (o teste abre /?hoje=2026-09-30).
npx playwright install chromium
E2E_PORT=3100 npm run e2e              # sobe (ou reutiliza) `next dev` na E2E_PORT
```

O e2e percorre intro → nome → formado → nunca fez → demais perguntas → parte 2 → 5 questões → contato
(WhatsApp e e-mail) → resultado (com o nome), e confere a OAB (48/49/50) e a mensagem "Nossa equipe vai te enviar o seu resultado no WhatsApp"
(a tela não tem botão de WhatsApp nem de download); também testa o botão **Voltar**. Cada execução cria um lead novo
(`maria+<timestamp>@exemplo.com`). Se o `.env.local` apontar para um banco compartilhado, use um nome reconhecível:
`E2E_NOME=TESTE E2E_PORT=3100 npm run e2e` e depois apague com `delete from quiz_oab_sessions where nome = 'TESTE';`.

### Problemas comuns

- **`docker pull`/`docker build` travam (Docker Desktop no macOS).** Em algumas instalações o
  credential helper (`credsStore: desktop`) trava. Use um `DOCKER_CONFIG` temporário sem
  `credsStore`, apontando para os plugins do Docker Desktop (para o `docker compose` continuar
  existindo):

  ```bash
  mkdir -p /tmp/dockercfg
  echo '{"auths":{},"cliPluginsExtraDirs":["/Applications/Docker.app/Contents/Resources/cli-plugins"]}' > /tmp/dockercfg/config.json
  export DOCKER_CONFIG=/tmp/dockercfg
  ```
- **Porta 3000 ocupada:** `npx next dev -p 3100` e `APP_URL=http://localhost:3100`.
- **O diagnóstico do lead fica em "Erro" no `/admin`:** o serviço de PDF está fora do ar
  ou com segredo diferente — `docker compose -p quiz-oab logs diagnostico-pdf`; depois
  "Regenerar" no `/admin`.

## 4. Variáveis de ambiente

Todas estão no [`.env.example`](.env.example), com comentários.

| Variável | Quem usa | Local | Produção (AWS) |
| --- | --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Next (servidor) | `http://127.0.0.1:64321` + chave do `supabase status` | projeto Supabase de produção |
| `ADMIN_PASSWORD` | Next | qualquer | longa e aleatória |
| `ADMIN_SESSION_SECRET` | Next | qualquer | `openssl rand -base64 48`; trocar invalida todas as sessões |
| `DIAGNOSTICO_SERVICE_URL` | Next | `http://localhost:8000` | URL interna do serviço |
| `DIAGNOSTICO_SERVICE_SECRET` | Next **e** serviço | `segredo-local` | segredo forte, igual nos dois |
| `BUCKET_NAME`, `REGION` | Next **e** serviço | `diagnosticos-oab`, `us-east-1` | `vicio-quiz-oab-s3`, `sa-east-1` |
| `ACCESS_KEY`, `SECRET_KEY` | Next **e** serviço | `minioadmin` | **não definir** (IAM role) |
| `S3_ENDPOINT` | Next **e** serviço | `http://localhost:9000` (no compose o serviço usa `http://minio:9000`; `S3_PDF_ENDPOINT` troca isso, vazio = AWS) | vazio |
| `S3_PUBLIC_ENDPOINT` | Next | `http://localhost:9000` (o que o navegador enxerga) | vazio |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Next | Mailpit `localhost:1025` | SMTP do provedor; `SMTP_HOST` vazio = não envia (registra `email_erro`) |
| `APP_URL` | Next | `http://localhost:3000` | URL pública do quiz (base do link do e-mail reenviado pelo `/admin`) |
| `ALLOW_HOJE_OVERRIDE` | Next | `1` no `.env.local` (vazio no `.env.example`) | **nunca** definir |
| `NEXT_PUBLIC_PRIVACIDADE_URL`, `NEXT_PUBLIC_VIDEO_PARTE2` | Next (navegador) | — | **build args** da imagem |
| `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`, `DIAGNOSTICO_PDF_PORT` | docker compose | padrões | — |
| `E2E_PORT` | Playwright | `3100` | — |
| `PORT` | serviço de PDF | `8000` | opcional |

## 5. Notas para o devops

- **Imagens:** `Dockerfile` (Next, standalone, roda como usuário `node`, porta 3000) e
  `services/diagnostico-pdf/Dockerfile` (FastAPI + Chromium, porta `${PORT:-8000}`).

  ```bash
  docker build -t quiz-oab \
    --build-arg NEXT_PUBLIC_PRIVACIDADE_URL=https://... \
    --build-arg NEXT_PUBLIC_VIDEO_PARTE2=https://... .
  docker build -t quiz-oab-diagnostico-pdf services/diagnostico-pdf
  docker run --env-file .env.producao -p 3000:3000 quiz-oab
  ```
- **`NEXT_PUBLIC_*` são embutidas no build** (bundle do navegador): passar como `--build-arg`;
  defini-las só no runtime não tem efeito. As demais são lidas em runtime.
- **S3 por IAM role:** não definir `ACCESS_KEY`/`SECRET_KEY`; `S3_ENDPOINT`/`S3_PUBLIC_ENDPOINT`
  vazios. O Next precisa de `s3:GetObject` (só assina URLs); o serviço, de `s3:PutObject`.
- **SMTP:** o do provedor escolhido (`SMTP_*`); remetente ainda a definir pelo VDE.
- **Rate limit em memória, por instância:** com mais de uma instância do Next cada uma conta por
  si; para um limite global é preciso um armazenamento compartilhado (ex.: Redis) ou o WAF.
- **IP do cliente (`lib/server/ip.ts`):** usa o **último** valor do `X-Forwarded-For`. Isso só
  está certo atrás de exatamente um proxy confiável (ALB direto). Sem proxy nenhum o header não
  vem e todo mundo cai na mesma chave (`desconhecido`), dividindo um único limite. Atrás de
  CloudFront + ALB o último salto é o CloudFront, e todos os usuários também passam a dividir o
  mesmo limite.
- **`after()`:** o PDF é disparado com `after()` depois da resposta do `finish`. Funciona em
  container Node de longa duração (não em serverless que congela após a resposta). Se o
  container reiniciar no meio da geração (deploy), o diagnóstico fica `pendente`, vira `erro`
  após 10 min e pode ser regenerado no `/admin` ("Regenerar"; para um `pendente` recente, de
  menos de 60 s, o admin recusa para não gerar em duplicidade).
- **Link do diagnóstico é público e sem validade** (quem tem o link baixa; o PDF tem dados
  pessoais). As respostas vêm com `Cache-Control: no-store` e `X-Robots-Tag: noindex`; a URL
  assinada do S3 expira em 5 min, mas o link do app não.
- **Admin:** senha única (`ADMIN_PASSWORD`) e cookie assinado (HMAC, 7 dias). Não há revogação
  de sessão no servidor: trocar `ADMIN_SESSION_SECRET` derruba todas as sessões.
- **`ALLOW_HOJE_OVERRIDE` nunca em produção** (deixaria qualquer um simular a data).
- **Serviço de PDF:** se o Chromium cair, a próxima requisição relança o browser; cada render
  tem teto de ~40 s (estourou → HTTP 504). `GET /health` (sem autenticação) responde **503**
  `{"ok": false, "browser": "desconectado"}` enquanto o browser estiver caído e 200 `{"ok": true}`
  quando está de pé.
- **Imagem Python:** roda como root e inclui o pytest. Aceitável por ora; endurecer depois
  (usuário não-root, imagem sem dependências de teste).
- **Tela final sem botões:** não há botão de WhatsApp nem de download; os eventos `quiz_whatsapp` e
  `quiz_download` deixaram de existir. O time encontra o lead no `/admin` (busca por nome, ref
  `#ABCD`, e-mail ou telefone) e baixa o PDF de lá. Os endpoints `/api/quiz/whatsapp` e
  `/api/quiz/result` continuam no servidor, mas o quiz não os usa mais.
- **E-mail:** o diagnóstico **não** é mais enviado por e-mail ao lead. O botão "Reenviar e-mail" do
  `/admin` segue disponível para uso manual do time.
- **Lista do `/admin`:** mostra **todas** as sessões, inclusive visitas anônimas que nunca
  deixaram contato (aparecem como "sem contato"). Para ver só quem terminou o quiz, use o filtro
  de status **Concluído**.
- **URLs do admin levam o token do diagnóstico**, que é o mesmo token do link público do PDF.
  Não cole URLs do admin em canais compartilhados (Slack, grupos, tickets): quem tiver a URL
  baixa o PDF com os dados pessoais do lead.

## Design

O design (cores, tipografia, raios, sombras, estados e regras) está em [`DESIGN.md`](DESIGN.md). O quiz usa o CSS
gerado do original (`app/(quiz)/quiz.css`); o painel `/admin` usa os mesmos valores como tokens em
`app/globals.css` e os componentes de `components/admin/ui.tsx`. Tela nova do admin parte desses componentes.

## Painel `/admin`

- **Leads:** busca (ref, nome, e-mail, WhatsApp), filtros de tipo, prova, status e diagnóstico, CSV, colunas de resultado, teste (X de 5) e origem.
- **Detalhe do lead:** contato, origem (UTM), resultado, perfil, teste questão a questão, links copiáveis para o CRM, outras tentativas, e o
  **diagnóstico completo formatado** (o mesmo HTML que vira PDF, num `iframe` com `sandbox`). Ações: Baixar PDF, **Abrir no WhatsApp** (conversa
  com o lead, mensagem pronta e link do PDF), Regenerar e Reenviar e-mail.
- **Analytics (`/admin/analytics`):** período (tudo/30/7 dias), indicadores, sessões por dia, funil, onde as pessoas desistem, resultados, perfil
  das respostas, teste de nível, origem do tráfego e prioridade comercial. Lê até 5000 sessões.
- O diagnóstico embutido vem do serviço de PDF (`POST /diagnostico/html`, mesma autenticação e validações de `/diagnostico`). Se o serviço
  estiver fora do ar, a página do lead abre com um aviso e o resto continua funcionando.

## 6. Banco

Uma tabela (`quiz_oab_sessions`), criada pela migration em `supabase/migrations/`. O prefixo `quiz_oab_` evita conflito
com a `quiz_sessions` do quiz Tribunais, então os dois podem dividir o mesmo projeto Supabase (a migration só cria objetos novos). Local: `npx supabase start`
aplica sozinho. **Produção (Supabase na nuvem):** siga o guia passo a passo em
[`supabase/README.md`](supabase/README.md) (criar o projeto, `supabase link` + `supabase db push`, e
conferir com `supabase/verificacao.sql`). No app só entram `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Atualizar as turmas / datas

A fonte única é `reference/qual-a-oab-dev/_build/data.json`:

1. Editar `reference/qual-a-oab-dev/_build/data.json`.
2. `npm run sync:oab` (copia para `lib/oab/` — `data.json`, `logic.js`, `dataHash.ts` — e para
   `services/diagnostico-pdf/vendor/`, com o hash em `data.sha256`).
3. Rodar os testes (`npx vitest run` e o `pytest` do serviço).
4. Republicar **as duas imagens juntas** (Next e serviço de PDF). O hash do `data.json` protege
   contra divergência: se só uma for atualizada, o serviço responde `409` e o diagnóstico fica
   `erro` até as duas baterem.

**Quando o VDE envia um zip novo** (em vez de editar o `data.json`): descompactar sobre
`reference/qual-a-oab-dev` (apagando o que sumiu do pacote), rodar `npm run sync:oab`, rodar
`npx vitest run` + `pytest` do serviço e reconstruir as **duas** imagens. Um container `diagnostico-pdf` já rodando, construído **antes**
da troca do `data.json`, responde `409` na checagem do hash (ver o passo 4 acima): os novos
diagnósticos ficam `erro` até o container ser **recriado** a partir da imagem nova (local:
`docker compose -p quiz-oab --env-file .env.local up -d --build diagnostico-pdf`).

### Fluxo do quiz (v3)

- **Nome primeiro:** a tela "Como podemos te chamar?" vem logo após a intro; o nome é gravado no
  `answer`; se o corpo do `finish` trouxer um nome válido, ele prevalece sobre o da sessão (o
  `finish` reenvia respostas e teste do cliente pelo mesmo motivo); sem nome no corpo, vale o da
  sessão. O nome aparece nos títulos das perguntas e no resultado.
- **Formulário final enxuto:** só WhatsApp e e-mail. `nome_completo` fica nulo nas sessões novas
  (a coluna foi mantida); o `/admin` mostra e exporta o `nome`.
- **Datas de turma:** turma sem data aparece como "Data a confirmar" e há dois cronogramas.
  Datas internas de turmas `aConfirmar` são só da lógica e não são exibidas.

## 8. Pendências

- **Devops:** subir as duas imagens, a IAM role do bucket e as variáveis (veja [`docs/DEPLOY.md`](docs/DEPLOY.md)).
- **VDE:** URL da política de privacidade e vídeo da parte 2 (o quiz roda sem eles, com
  placeholders). Não é mais preciso informar o número do WhatsApp: a tela final não o usa.
- **LGPD:** não há política de retenção/exclusão nem ação de excluir lead no admin; precisa ser
  tratado antes de produção.
