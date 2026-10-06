# Guia de deploy (devops)

Checklist para colocar o Quiz OAB no ar na AWS. Detalhes de cada item estão no
[README](../README.md); este arquivo é o caminho curto.

## O que sobe

| Serviço | Imagem | Porta | Observação |
| --- | --- | --- | --- |
| **Quiz + admin** (Next.js) | `Dockerfile` na raiz | 3000 | container Node de longa duração (não serverless: o PDF é disparado com `after()`) |
| **Serviço de PDF** (FastAPI + Chromium) | `services/diagnostico-pdf/Dockerfile` | `${PORT:-8000}` | só rede interna; o Next é o único cliente |
| **Banco** | Supabase (nuvem) | — | tabela `quiz_oab_sessions` |
| **Bucket S3** | — | — | `vicio-quiz-oab-s3`, região `sa-east-1` |

As duas imagens têm de ser publicadas **juntas** (o `data.json` das turmas é conferido por hash;
divergência = HTTP 409 e diagnóstico em `erro`).

## 1. Banco (Supabase)

A migration `supabase/migrations/20260930120000_quiz_oab_sessions.sql` só **cria** objetos novos, todos com o
prefixo `quiz_oab_` (tabela, 4 índices, função e trigger). Não altera nenhuma tabela existente, então pode ir
num projeto compartilhado. Passo a passo e verificação: [`supabase/README.md`](../supabase/README.md) e
`supabase/verificacao.sql`.

O app precisa só de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (chave de servidor; nunca no navegador).

## 2. Bucket e permissões (IAM role, sem chave)

- Bucket privado `vicio-quiz-oab-s3` em `sa-east-1`. Sem acesso público.
- **Não definir** `ACCESS_KEY`/`SECRET_KEY` em produção: o SDK usa a role da tarefa/pod.
- Role do **Next**: `s3:GetObject` no bucket (só assina URLs de download).
- Role do **serviço de PDF**: `s3:PutObject` no bucket.
- `S3_ENDPOINT` e `S3_PUBLIC_ENDPOINT` ficam **vazios** (eles existem só para o MinIO local).

## 3. Build

```bash
docker build -t quiz-oab \
  --build-arg NEXT_PUBLIC_PRIVACIDADE_URL=https://... \
  --build-arg NEXT_PUBLIC_VIDEO_PARTE2=https://... .
docker build -t quiz-oab-diagnostico-pdf services/diagnostico-pdf
```

`NEXT_PUBLIC_*` são embutidas no build (não funcionam só em runtime). Se a política de privacidade e o vídeo ainda
não existirem, deixe vazio: o quiz roda sem eles.

## 4. Variáveis de ambiente (produção)

**Next (quiz + admin)**

| Variável | Valor |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | do projeto Supabase |
| `ADMIN_PASSWORD` | senha longa e aleatória do `/admin` |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 48` |
| `DIAGNOSTICO_SERVICE_URL` | URL **interna** do serviço de PDF |
| `DIAGNOSTICO_SERVICE_SECRET` | segredo forte, **igual** nos dois serviços |
| `BUCKET_NAME` / `REGION` | `vicio-quiz-oab-s3` / `sa-east-1` — **`REGION` é obrigatória**: sem ela o código assume `us-east-1` e a URL assinada de download falha |
| `APP_URL` | URL pública do quiz (links do admin) |
| `SMTP_*` | opcional; só para o botão "Reenviar e-mail" do admin |

**Serviço de PDF**: `DIAGNOSTICO_SERVICE_SECRET`, `BUCKET_NAME`, `REGION` (e `PORT`, se quiser outra porta).

**Nunca definir em produção:** `ALLOW_HOJE_OVERRIDE` (deixaria qualquer pessoa simular a data), `ACCESS_KEY`, `SECRET_KEY`.

## 5. Verificação depois do deploy

1. `GET <serviço-pdf>/health` → `200 {"ok": true}`. Logo depois de subir, o Chromium pode levar alguns segundos e o endpoint responde `503` até conectar; configure o health check do ALB/ECS com tolerância (período inicial de ~30 s e 3 falhas seguidas) para não reiniciar a tarefa em loop.
2. Abra o quiz, responda como **"TESTE"** até o fim; a tela final deve mostrar o resultado e o aviso do WhatsApp.
3. Em `/admin`, o lead "TESTE" deve aparecer com diagnóstico **Pronto** e o PDF deve baixar.
4. Apague o lead de teste: `delete from quiz_oab_sessions where nome = 'TESTE';`.

Se o diagnóstico ficar em **Erro**: veja os logs do serviço de PDF (segredo diferente, permissão do bucket ou
`data.json` divergente entre as imagens) e use "Regenerar" no `/admin`.

## 6. Pontos de atenção

- **Rate limit** é em memória, por instância; para um limite global use WAF ou Redis.
- **IP do cliente:** `lib/server/ip.ts` usa o último valor de `X-Forwarded-For` (certo atrás de **um** proxy confiável).
- **Link do diagnóstico é público e sem validade** (tem dados pessoais); a URL assinada do S3 expira em 5 min.
- **LGPD:** ainda não há política de retenção nem ação de excluir lead; definir antes de produção.
- **Imagem Python** roda como root e traz o pytest; endurecer depois.
