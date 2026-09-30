# Contexto pra quem for continuar — quiz OAB (Método VDE)

Este repo nasceu de uma conversa de brainstorming (sessão `vicio_quiz`,
2026-09-30) que ainda não terminou — o que está aqui é o ponto de partida,
não um spec aprovado. Antes de implementar, retomar o processo arquitetural
(perguntas → abordagens → design em seções → spec escrita → plano).

## O produto

Funil de quiz do Método VDE (1ª fase da OAB): responde ~2min, descobre qual
prova de 2027 (OAB 48/49/50) e qual turma são ideais, e recebe um laudo em
PDF. Detalhe completo do negócio em
[`reference/qual-a-oab-dev/ENTREGA-DEV.md`](../reference/qual-a-oab-dev/ENTREGA-DEV.md)
e [`reference/qual-a-oab-dev/README.md`](../reference/qual-a-oab-dev/README.md).

A entrega original (`reference/qual-a-oab-dev/`) foi feita como site estático
autocontido + pacote Python standalone (CLI, sem servidor): o consultor colava
um código `QO1...` do WhatsApp num comando `python3 -m diagnosis` pra gerar o
PDF na mão. **Essa pasta é só conteúdo/lógica de referência — não editar.**
É a fonte de verdade de: perguntas, regra de recomendação (`logic.js`/`logic.py`
espelhados), copy do laudo (`diagnosis/report.py`, `diagnosis/argumentos.py`)
e os 104 casos de teste (`casos-de-teste.json`) pra validar qualquer porta.

## Decisões já tomadas (nesta conversa)

- **Fluxo automático (não o CLI manual).** Lead cai num banco, o PDF é gerado
  sozinho em background assim que o quiz termina, sobe pra storage, fica um
  link estável, e existe um painel admin pra ver leads — igual ao outro quiz
  da VDE (Tribunais), não o fluxo manual da entrega original.
- **Repo próprio, separado do `vicio_quiz`** (o quiz Tribunais). Motivo: o
  Tribunais está em produção na Vercel — não faz sentido arrastar ele pra uma
  migração de infra só pra caber o OAB. Ele continua como está, intocado.
- **Projeto Supabase novo**, não o mesmo do Tribunais — blast radius, migrations
  e connection limits independentes. Mesmo motivo do repo separado.
- **Deploy em AWS, não Vercel.** Local pra teste. **Ainda não decidido**: qual
  serviço AWS (ECS/Fargate, App Runner, EC2...) hospeda o Next.js. Precisa
  verificar se o `after()` do Next.js (disparo do PDF em background sem
  atrasar a resposta) funciona igual fora da Vercel antes de depender dele —
  se não funcionar, a orquestração de background precisa de outro mecanismo
  (fila, endpoint separado, etc.).
- **`reference/tribunais-patterns/`** — cópia de arquivos do `vicio_quiz` pra
  usar como *molde de estrutura*, não código pra colar. **Não roda nem
  compila como está** (faltam imports internos, `testHelpers/`, etc. — é
  só leitura). Inclui:
  - `lib/server/` — admin auth (senha + cookie HMAC), rate limit em memória,
    client S3, export CSV, `quizService` + `sessionRepo`/`supabaseSessionRepo`
    (padrão de interface de persistência + implementação Supabase),
    `supabaseAdmin.ts` (client com `service_role`), orquestração do PDF em
    background, cliente HTTP do serviço Python, `leadsDesqualificados*`
    (padrão de captura de lead fora do público-alvo — o equivalente aqui seria
    quem "sai antes" no funil OAB, ver `ENTREGA-DEV.md` item 1), `ip.ts`,
    `uuid.ts`, `listarTudo.ts`.
  - `lib/` (fora de `server/`) — `validacao.ts`/`mascara.ts` (validação de
    e-mail/DDD e máscara de telefone — o OAB precisa do mesmo), `normalize.ts`
    (normalização pra dedupe), `analytics.ts` (agregação pro admin),
    `storage.ts` (padrão de estado local do quiz no navegador),
    `adminLabels.ts` (mapa valor→rótulo legível pro painel).
  - `components/` — `Button`, `OptionButton`, `ProgressBar`, `Header`, e
    `components/admin/*` (gráficos/tabelas do painel: funil, sparkline, etc.).
  - `app/admin/`, `app/api/` (rotas completas: `quiz/*`, `admin/*`,
    `leads/desqualificado`, `laudo/[token]`, `apresentacao/[token]`),
    `app/globals.css` (tokens de cor/tipografia citados no `DESIGN.md`),
    `middleware.ts` (proteção das rotas `/admin`).
  - `services/diagnostico-pdf/` inteiro (FastAPI + Playwright + Dockerfile),
    sem o `vendor/` (conteúdo/templates específicos do Tribunais) nem
    `vercel.json`/`.vercel/` (não se aplica — vamos pra AWS).
  - Configs: `package.json`, `tsconfig.json`, `next.config.ts`,
    `vitest.config.ts`/`vitest.setup.ts`, `postcss.config.mjs`,
    `.env.example` (nomes de variável, sem valores).
  - `supabase/migrations/` (as 9 migrations do Tribunais, só como exemplo de
    convenção de nome/ordem — o schema em si é outro, específico do OAB).
  - `DESIGN.md`/`README.md` como referência de como documentar.

  **Fora de propósito, não copiado de propósito** (lógica/conteúdo específico
  do domínio Tribunais, sem valor de reuso pro OAB — que já tem sua própria
  fonte de verdade em `reference/qual-a-oab-dev/_build/data.json` +
  `diagnosis/`): `lib/scoring.ts`, `perfil.ts`, `blocos.ts`, `areasLabels.ts`,
  `questions.ts`, `quizContent.ts`, `pieChart.ts`, `components/Quiz.tsx`,
  `services/diagnostico-pdf/vendor/`.

  **Decisão de credenciais AWS já validada antes** (ver comentário do próprio
  `.env.example` copiado): em infra AWS de verdade, o SDK deve resolver
  credencial via IAM role/IRSA por padrão; `ACCESS_KEY`/`SECRET_KEY`
  explícitas ficam só como fallback pra ambiente local. Vale tanto pro S3
  quanto pra qualquer outro serviço AWS que o app passe a usar.

## Ainda em aberto (continuar o brainstorming a partir daqui)

- Escolha do serviço AWS pro Next.js self-hosted (e pro serviço Python de PDF).
- Confirmar `after()`/background execution fora da Vercel.
- Schema do Supabase pro OAB (campos do quiz: `situacao, regime, periodo,
  grade, tentativa, pontos, nivel, inscrito, metodo, horas, trabalho, vde,
  rotina, trava, motivo, compromisso, investir, parcela, teste` — ver
  `ENTREGA-DEV.md` > "O código QO1" pra lista completa e ordem).
- Porte da regra de recomendação (`logic.js`/`logic.py`) pra dentro do
  `quizService` (TS) e do microserviço Python (laudo).
- Identidade visual do OAB (cores/logo/fontes) — `assets/` da entrega já tem
  fontes e logo, mas o `DESIGN.md` do Tribunais é de outra marca/paleta.
- Decidir o quanto do painel admin (Tribunais tem analytics, export CSV,
  detalhe de lead) é necessário pro OAB de início, ou se um MVP mais simples
  já resolve.
