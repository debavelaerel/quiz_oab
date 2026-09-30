create table quiz_sessions (
  id bigint generated always as identity primary key,
  session_token uuid not null unique default gen_random_uuid(),
  diagnostico_token uuid not null unique default gen_random_uuid(),
  ref_curta text not null unique,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluido', 'saiu')),
  saida_tipo text check (saida_tipo in ('cedo', 'f2')),
  ultima_pergunta text,
  seq integer not null default 0,
  respostas jsonb not null default '{}'::jsonb,
  teste jsonb not null default '[]'::jsonb,
  nome_completo text,
  nome text,
  email text,
  whatsapp text,
  email_normalizado text,
  whatsapp_normalizado text,
  consentimento_em timestamptz,
  consentimento_versao text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  hoje date not null,
  codigo text,
  recomendacao jsonb,
  tipo text,
  exame text,
  turma integer,
  whatsapp_clicado_em timestamptz,
  diagnostico_status text check (diagnostico_status in ('nao_se_aplica', 'pendente', 'pronto', 'erro', 'desligado')),
  diagnostico_solicitado_em timestamptz,
  diagnostico_pdf_s3_key text,
  diagnostico_pdf_erro text,
  email_enviado_em timestamptz,
  email_erro text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index quiz_sessions_email_norm_idx on quiz_sessions (email_normalizado);
create index quiz_sessions_whatsapp_norm_idx on quiz_sessions (whatsapp_normalizado);
create index quiz_sessions_started_at_idx on quiz_sessions (started_at desc);
create index quiz_sessions_tipo_exame_idx on quiz_sessions (tipo, exame);

create function quiz_sessions_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger quiz_sessions_updated_at before update on quiz_sessions
  for each row execute function quiz_sessions_set_updated_at();

-- RLS ligado e SEM policy: só a service_role (que ignora RLS) acessa.
alter table quiz_sessions enable row level security;
