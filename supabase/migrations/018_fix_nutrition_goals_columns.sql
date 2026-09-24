-- ══════════════════════════════════════════════════════════════════
--  FIX: garante todas as colunas de nutrition_goals + as da análise em
--  dietary_profile, num único script idempotente.
--
--  Motivo: em produção deu "Could not find the 'meal_split' column of
--  'nutrition_goals' in the schema cache" — sinal de que a migration 013
--  (e provavelmente 010/017) não foi aplicada. Este script consolida
--  010 + 013 + 017 e é seguro rodar quantas vezes quiser (add if not
--  exists). Não toca em dados nem em RLS.
--
--  Rode no SQL Editor do Supabase.
-- ══════════════════════════════════════════════════════════════════

-- (010) meta diária de água
alter table public.nutrition_goals
  add column if not exists water_ml_goal integer not null default 2000;

-- (013) distribuição da meta diária de calorias entre as refeições (%)
alter table public.nutrition_goals
  add column if not exists meal_split jsonb not null
  default '{"Café":25,"Almoço":35,"Lanche":10,"Jantar":25,"Ceia":5}'::jsonb;

-- (017) periodização de calorias por dia da semana {0..6: kcal}
alter table public.nutrition_goals
  add column if not exists weekly_calories jsonb not null default '{}'::jsonb;

-- (017) cache da análise nutricional gerada pela IA
alter table public.dietary_profile
  add column if not exists last_analysis jsonb;
alter table public.dietary_profile
  add column if not exists last_analysis_at timestamptz;

-- Força o PostgREST a recarregar o schema cache (o erro mencionava
-- justamente o "schema cache" desatualizado).
notify pgrst, 'reload schema';
