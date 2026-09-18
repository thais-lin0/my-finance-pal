-- ══════════════════════════════════════════════════════════════════
--  Migration: calorias gastas por atividade da Agenda
--
--  Quando uma atividade é marcada como "feito", o app pede as calorias
--  gastas naquela atividade (corrida, academia, etc). O total do dia é
--  a soma das atividades concluídas naquela data, mostrado no Diário da
--  Nutrição (informativo — NÃO altera a meta de ingestão calórica).
--
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

alter table public.activities
  add column if not exists calories_burned integer;
