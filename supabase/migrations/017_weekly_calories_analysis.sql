-- ══════════════════════════════════════════════════════════════════
--  Migration 017: periodização de calorias por dia da semana + cache
--  da análise nutricional gerada pela IA.
--
--  (1) nutrition_goals.weekly_calories — mapa jsonb {0..6: kcal} onde
--      0=Segunda … 6=Domingo. Sobrepõe a meta base (calories) SOMENTE
--      nos dias preenchidos; dias ausentes usam a meta base. Assim dias
--      de treino pesado sobem e dias de descanso descem, sem quebrar
--      quem não periodiza (mapa vazio = comportamento antigo).
--
--  (2) dietary_profile.last_analysis — último JSON de análise da IA
--      (decisão central, cálculo energético, tabela semanal, DOIs,
--      lacunas, ressalvas). Cacheado pra pessoa reabrir sem re-gerar.
--
--  Ambos idempotentes. Só adicionam colunas; não tocam dados nem RLS.
-- ══════════════════════════════════════════════════════════════════

alter table public.nutrition_goals
  add column if not exists weekly_calories jsonb not null default '{}'::jsonb;

alter table public.dietary_profile
  add column if not exists last_analysis jsonb;

alter table public.dietary_profile
  add column if not exists last_analysis_at timestamptz;
