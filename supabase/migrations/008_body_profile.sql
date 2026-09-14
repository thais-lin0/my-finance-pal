-- ══════════════════════════════════════════════════════════════════
--  Migration: perfil corporal (idade/altura) em body_goals
--  Usado pra calcular IMC (Medidas) e como entrada da IA que gera as
--  metas de calorias/macros (Diário). Idempotente.
-- ══════════════════════════════════════════════════════════════════

alter table public.body_goals add column if not exists birth_date date;
alter table public.body_goals add column if not exists height_cm numeric(5,1);
