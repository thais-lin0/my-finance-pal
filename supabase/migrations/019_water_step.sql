-- ══════════════════════════════════════════════════════════════════
--  Migration: tamanho padrão de entrada de água (módulo Nutrição)
--  Guarda o "copo/garrafa padrão" da usuária (ex: 1100 ml) para que um
--  clique único no resumo do Diário registre esse volume de água direto,
--  sem abrir o painel. É preferência por usuário → fica em nutrition_goals.
--  Default: 500 ml. Idempotente (safe rodar quantas vezes quiser).
--
--  Rode no SQL Editor do Supabase.
-- ══════════════════════════════════════════════════════════════════

alter table public.nutrition_goals
  add column if not exists water_step_ml integer not null default 500;

-- Passo padrão de passos: um clique no resumo do Diário soma esse valor ao
-- total do dia (ex: 1000 passos por clique). Default 1000.
alter table public.nutrition_goals
  add column if not exists steps_step integer not null default 1000;

-- Recarrega o schema cache do PostgREST (evita "Could not find the
-- 'water_step_ml' column ... in the schema cache").
notify pgrst, 'reload schema';
