# Banco de dados (Supabase) — guia de deploy

O quiz grava tudo em **uma tabela**, `public.quiz_oab_sessions` (uma linha por tentativa). Este guia mostra
como criar o banco no Supabase (nuvem) a partir das migrations deste repositório e como conferir que
ficou certo. **Nada aqui é enviado automaticamente**: o deploy é um passo manual seu.

## O que tem nesta pasta

| Arquivo | Para quê |
|---|---|
| `migrations/20260930120000_quiz_oab_sessions.sql` | Cria a tabela, índices, trigger de `updated_at`, RLS e os grants. É a **única** migration. |
| `verificacao.sql` | Conferência **somente leitura** para rodar depois do deploy (todas as linhas devem dar `ok = true`). |
| `config.toml` | Configuração do Supabase **local** (`supabase start`). **Não afeta o projeto na nuvem.** As portas estão deslocadas (643xx) para não colidir com outros Supabase locais. |

## Antes de começar

1. Crie um **projeto novo** no Supabase (não reaproveite o do Tribunais: migrations, limites de conexão
   e blast radius ficam independentes). Escolha o Postgres **17** (o mesmo do ambiente local) e uma
   região próxima do servidor da AWS.
2. Guarde a senha do banco que o Supabase pedir na criação (só vai ser usada pelo CLI).
3. Instale o Supabase CLI (`brew install supabase/tap/supabase`) e faça `supabase login`.

## Aplicar as migrations

Na raiz do repositório:

```bash
supabase link --project-ref <REF_DO_PROJETO>     # o "Reference ID" em Project Settings → General
supabase db push --dry-run                        # mostra o que seria aplicado, sem aplicar
supabase db push                                  # aplica as migrations pendentes
```

Alternativa sem CLI: abra **SQL Editor** no dashboard, cole o conteúdo de
`migrations/20260930120000_quiz_oab_sessions.sql` e execute **uma vez**.

## Conferir depois do deploy

No **SQL Editor**, cole `verificacao.sql` e execute. Esperado: 10 linhas, todas com `ok = true`
(tabela existe, RLS ligado, nenhuma policy, `service_role` com os 4 privilégios, `anon`/`authenticated`
sem nenhum, índices e uniques, trigger, função com `search_path` vazio e os 3 checks).

Se alguma linha der `false`, **não suba o app**: veja a seção "Problemas comuns".

## Variáveis do app

O app só fala com o banco pelo servidor (as rotas de API), sempre com a **service_role**:

| Variável | Onde pegar |
|---|---|
| `SUPABASE_URL` | Project Settings → API → **Project URL** (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** (ou "Secret key") |

- A `service_role` **ignora o RLS**: trate como senha. Ela fica só no servidor (variável de ambiente
  do container/secret manager); **nunca** em `NEXT_PUBLIC_*`, no navegador ou em log.
- O app **não usa** a chave `anon`. A tabela não tem policy, então `anon`/`authenticated` não leem nada
  mesmo que alguém consiga a chave pública.
- O acesso é pela Data API (supabase-js), não por conexão Postgres direta; não precisa de pooler.

## Regras para mudar o banco depois

- Toda mudança vira uma **migration nova**, com nome `AAAAMMDDHHMMSS_descricao.sql` (ordem cronológica).
- **Nunca edite** uma migration já aplicada em produção (a v1 foi ajustada só enquanto ainda era local).
  Para alterar a tabela, crie `..._altera_quiz_oab_sessions.sql` com `alter table ...`.
- Teste local antes: `supabase db reset` recria o banco local do zero aplicando todas as migrations
  (apaga os leads de teste locais).
- A coluna `nome_completo` foi mantida de propósito (fica `null` nas sessões novas; ver a spec §10.1).

## Backup, retenção e LGPD (pendente)

- A tabela guarda dados pessoais (nome, e-mail, WhatsApp, respostas). O projeto Supabase faz backup
  conforme o plano contratado; confira a retenção do plano.
- **Ainda não existe** política de retenção/exclusão nem ação de excluir lead no painel. Precisa ser
  definida com o VDE antes de produção.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `permission denied for table quiz_oab_sessions` no app | Faltou o grant para a `service_role` (projetos novos não expõem tabelas novas) | Reaplicar as últimas linhas da migration (`grant ... to service_role`) |
| App devolve 500 em `/api/quiz/start` | `SUPABASE_URL` ou a chave errada/ausente no ambiente | Conferir as duas variáveis no container |
| `verificacao.sql`: "nenhuma policy" dá `false` | Alguém criou policy pelo dashboard | Remover a policy (o acesso é só pela `service_role`) |
| `verificacao.sql`: "anon e authenticated sem privilégio" dá `false` | Grant manual no dashboard | `revoke all on public.quiz_oab_sessions from anon, authenticated;` |
| `supabase db push` reclama de histórico divergente | A tabela foi criada à mão antes pelo SQL Editor | `supabase migration repair --status applied 20260930120000` e rodar `db push` de novo |
