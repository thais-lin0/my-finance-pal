-- ══════════════════════════════════════════════════════════════════
--  Migration: metas por refeição (módulo Nutrição)
--  Em vez de guardar 5 metas fixas de kcal, guardamos a DISTRIBUIÇÃO da
--  meta diária de calorias entre as refeições (percentual por refeição).
--  Assim, ao mudar a meta diária (manual ou pela IA), a meta de cada
--  refeição recalcula sozinha. Soma esperada ~100%.
--  Default: Café 25% · Almoço 35% · Lanche 10% · Jantar 25% · Ceia 5%.
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

alter table public.nutrition_goals
  add column if not exists meal_split jsonb not null
  default '{"Café":25,"Almoço":35,"Lanche":10,"Jantar":25,"Ceia":5}'::jsonb;
