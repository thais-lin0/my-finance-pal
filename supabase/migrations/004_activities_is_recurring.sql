-- ══════════════════════════════════════════════════════════════════
--  Migration: atividades fixas (recorrentes) na Agenda
--  Rode no SQL Editor se já tinha a tabela activities criada antes.
--  Idempotente (seguro rodar mais de uma vez).
-- ══════════════════════════════════════════════════════════════════

alter table public.activities
  add column if not exists is_recurring boolean not null default false;
