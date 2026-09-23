-- ══════════════════════════════════════════════════════════════════
--  Migration 014: endurecimento (hardening) de RLS
--  A auditoria (audit_rls.sql) confirmou que todas as tabelas têm RLS
--  ligada e políticas corretas (auth.uid() = user_id). Esta migration
--  fecha dois detalhes finos encontrados no Bloco 4:
--
--   1) water_logs não tinha política de UPDATE (só select/insert/delete).
--      Adiciona a de UPDATE para permitir editar um registro de água.
--
--   2) health_daily.UPDATE não tinha WITH CHECK — em tese permitiria
--      reatribuir a própria linha para outro user_id. Recria a política
--      com WITH CHECK para travar isso.
--
--  Idempotente (seguro rodar mais de uma vez). Não toca em dados.
-- ══════════════════════════════════════════════════════════════════

-- garante RLS ligada (no-op se já estava — a auditoria confirmou que sim)
alter table public.water_logs   enable row level security;
alter table public.health_daily enable row level security;

-- ── 1) water_logs: adicionar UPDATE (própria linha) ───────────────
drop policy if exists "water_logs_update_own" on public.water_logs;
create policy "water_logs_update_own" on public.water_logs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2) health_daily: UPDATE com WITH CHECK ────────────────────────
--   O `using` diz QUAIS linhas você pode atualizar; o `with check` diz
--   PARA QUE valor pode mudá-las. Sem o with_check, seria possível
--   mudar o user_id da linha para o de outra pessoa. Recriamos com os
--   dois para fechar essa borda.
drop policy if exists "health_daily_update_own" on public.health_daily;
create policy "health_daily_update_own" on public.health_daily
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
