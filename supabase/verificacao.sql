-- Conferência pós-deploy da tabela quiz_sessions. SOMENTE LEITURA.
-- Cole no SQL Editor do Supabase (ou: psql "$DATABASE_URL" -f supabase/verificacao.sql).
-- Resultado esperado: TODAS as linhas com ok = true.

select 'tabela public.quiz_sessions existe' as verificacao,
       to_regclass('public.quiz_sessions') is not null as ok
union all
select 'RLS ligado',
       coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.quiz_sessions')), false)
union all
select 'nenhuma policy (só a service_role acessa)',
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'quiz_sessions') = 0
union all
select 'service_role tem select, insert, update e delete',
       (select count(distinct privilege_type) from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'quiz_sessions' and grantee = 'service_role'
           and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) = 4
union all
select 'anon e authenticated sem nenhum privilégio',
       (select count(*) from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'quiz_sessions'
           and grantee in ('anon', 'authenticated')) = 0
union all
select 'unique em session_token, diagnostico_token e ref_curta',
       (select count(*) from pg_indexes
         where schemaname = 'public' and tablename = 'quiz_sessions' and indexdef ilike 'create unique index%'
           and (indexdef ilike '%(session_token)%' or indexdef ilike '%(diagnostico_token)%' or indexdef ilike '%(ref_curta)%')) = 3
union all
select 'índices de busca (e-mail, WhatsApp, data, tipo/exame)',
       (select count(*) from pg_indexes
         where schemaname = 'public' and tablename = 'quiz_sessions'
           and indexname in ('quiz_sessions_email_norm_idx', 'quiz_sessions_whatsapp_norm_idx',
                             'quiz_sessions_started_at_idx', 'quiz_sessions_tipo_exame_idx')) = 4
union all
select 'trigger updated_at presente',
       exists (select 1 from pg_trigger where tgrelid = to_regclass('public.quiz_sessions')
                 and tgname = 'quiz_sessions_updated_at' and not tgisinternal)
union all
select 'função do trigger com search_path vazio',
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname = 'quiz_sessions_set_updated_at'
                  and p.proconfig is not null and 'search_path=""' = any (p.proconfig))
union all
select 'checks de status, saida_tipo e diagnostico_status',
       (select count(*) from pg_constraint
         where conrelid = to_regclass('public.quiz_sessions') and contype = 'c') = 3
order by 1;
