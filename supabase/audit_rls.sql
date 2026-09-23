-- ══════════════════════════════════════════════════════════════════
--  AUDITORIA DE RLS (Row Level Security) — rode no SQL Editor do Supabase
--  Só LÊ o catálogo do Postgres. Não altera nada. Seguro rodar sempre.
--
--  Objetivo: confirmar que TODA tabela de dados do schema `public`
--  tem RLS ligada E tem políticas — para garantir que um usuário nunca
--  enxerga a linha do outro.
--
--  Como ler os resultados: são 3 blocos. Rode um de cada vez (ou o
--  arquivo inteiro e olhe cada resultado). O que importa:
--   • BLOCO 1 deve vir VAZIO   (nenhuma tabela com RLS desligada)
--   • BLOCO 2 deve vir VAZIO   (nenhuma tabela com RLS mas sem política)
--   • BLOCO 3 é o panorama: toda tabela deve ter rls_enabled = true
--     e um número de políticas > 0 (o normal aqui é 4: select/insert/
--     update/delete).
-- ══════════════════════════════════════════════════════════════════


-- ─── BLOCO 1 ────────────────────────────────────────────────────────
-- 🚨 TABELAS COM RLS DESLIGADA (estas estão EXPOSTAS — qualquer usuário
--     autenticado pode ler/escrever linhas de qualquer outro).
--     RESULTADO ESPERADO: 0 linhas. Se aparecer alguma, é o problema.
select
  c.relname                       as tabela,
  '🚨 RLS DESLIGADA'              as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'                 -- só tabelas comuns
  and c.relrowsecurity = false        -- RLS desligada
order by c.relname;


-- ─── BLOCO 2 ────────────────────────────────────────────────────────
-- ⚠️  TABELAS COM RLS LIGADA MAS SEM NENHUMA POLÍTICA.
--     Perigoso e enganoso: com RLS ligada e zero políticas, o padrão do
--     Postgres é NEGAR TUDO — a tabela para de funcionar pra usuários
--     comuns (some do app), mas via service_role/painel parece OK.
--     RESULTADO ESPERADO: 0 linhas.
select
  c.relname                          as tabela,
  '⚠️ RLS ligada, 0 políticas'       as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
  and not exists (
    select 1 from pg_policy p where p.polrelid = c.oid
  )
order by c.relname;


-- ─── BLOCO 3 ────────────────────────────────────────────────────────
-- 📋 PANORAMA COMPLETO: toda tabela do schema public, se a RLS está
--     ligada, e quantas políticas de cada comando ela tem.
--     Toda tabela de dados sua deve ter rls_enabled = true e,
--     idealmente, select/insert/update/delete = 1 (ou mais).
select
  c.relname                                                as tabela,
  c.relrowsecurity                                         as rls_enabled,
  count(p.polcmd)                                          as total_politicas,
  count(*) filter (where p.polcmd = 'r')                   as pol_select,
  count(*) filter (where p.polcmd = 'a')                   as pol_insert,
  count(*) filter (where p.polcmd = 'w')                   as pol_update,
  count(*) filter (where p.polcmd = 'd')                   as pol_delete,
  count(*) filter (where p.polcmd = '*')                   as pol_all
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity asc,   -- as sem RLS sobem pro topo (chamam atenção)
         c.relname;


-- ─── BLOCO 4 (opcional) ─────────────────────────────────────────────
-- 🔎 DETALHE DE CADA POLÍTICA: o texto exato do USING / WITH CHECK.
--     Use pra conferir que a regra é mesmo `auth.uid() = user_id`
--     (e não algo permissivo como `true`, que deixaria tudo aberto).
select
  c.relname                                   as tabela,
  p.polname                                   as politica,
  case p.polcmd
    when 'r' then 'SELECT'
    when 'a' then 'INSERT'
    when 'w' then 'UPDATE'
    when 'd' then 'DELETE'
    when '*' then 'ALL'
  end                                         as comando,
  pg_get_expr(p.polqual,     p.polrelid)      as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid)     as with_check_expr
from pg_policy p
join pg_class c     on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, comando;
