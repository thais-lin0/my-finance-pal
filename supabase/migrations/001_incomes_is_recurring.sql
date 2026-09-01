-- ══════════════════════════════════════════════════════════════════
--  Migration: itens fixos (recorrentes) em receitas
--  Rode isto no SQL Editor SÓ SE você já tinha rodado o schema.sql antes
--  de adicionarmos a recorrência de receitas. É idempotente (seguro rodar
--  mais de uma vez). Se você ainda não rodou nada, use apenas schema.sql.
-- ══════════════════════════════════════════════════════════════════

alter table public.incomes
  add column if not exists is_recurring boolean not null default false;
