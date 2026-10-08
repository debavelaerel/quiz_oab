-- Configurações editáveis pelo admin (hoje: as datas das turmas, chave 'turmas').
-- Sem linha = vale o data.json do repositório.
create table quiz_oab_config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- RLS ligado e SEM policy: só a service_role (que ignora RLS) acessa.
alter table quiz_oab_config enable row level security;
grant select, insert, update, delete on quiz_oab_config to service_role;
revoke all on quiz_oab_config from anon, authenticated;
