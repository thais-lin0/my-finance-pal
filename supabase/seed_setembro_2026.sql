-- ══════════════════════════════════════════════════════════════════
--  Seed: despesas fixas de Setembro/2026 (mês de referência)
--  Como usar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Ajuste o email na linha `v_email` para o email da SUA conta no app
--   3. Rode. Ele pega seu user_id automaticamente e insere as 25 despesas
--      como FIXAS (is_recurring = true), vencimento 07/09/2026.
--   4. Nos próximos meses, use o botão "Trazer fixos" — só ajuste os
--      valores dos cartões (que mudam mês a mês).
--
--  Seguro rodar mais de uma vez? NÃO — rodar de novo duplica as linhas.
--  Se precisar refazer, apague antes as despesas de set/2026 (veja o final).
-- ══════════════════════════════════════════════════════════════════

do $$
declare
  v_email text := 'thaislino2@gmail.com';  -- <<< troque se necessário
  v_uid   uuid;
  v_month date := '2026-09-01';
  v_due   date := '2026-09-07';
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Usuário % não encontrado em auth.users. Crie a conta no app primeiro.', v_email;
  end if;

  insert into public.expenses
    (user_id, description, category, amount, due_date, is_paid, is_recurring, ref_month)
  values
    (v_uid, 'Cartão C&A',              'Cartão de crédito',  133.00, v_due, true,  true, v_month),
    (v_uid, 'Cartão Black',            'Cartão de crédito', 1975.00, v_due, true,  true, v_month),
    (v_uid, 'Cartão Netshoes',         'Cartão de crédito', 1707.00, v_due, true,  true, v_month),
    (v_uid, 'Nubank',                  'Cartão de crédito', 6154.00, v_due, true,  true, v_month),
    (v_uid, 'Água mãe',                'Casa',                81.25, v_due, true,  true, v_month),
    (v_uid, 'Casa',                    'Casa',              2000.00, v_due, true,  true, v_month),
    (v_uid, 'Claro Mãe',               'Casa',               110.00, v_due, true,  true, v_month),
    (v_uid, 'Claro Casa',              'Casa',               110.00, v_due, true,  true, v_month),
    (v_uid, 'Claro Pai',               'Casa',                85.00, v_due, true,  true, v_month),
    (v_uid, 'Condomínio',              'Casa',               300.00, v_due, true,  true, v_month),
    (v_uid, 'Internet + Limpeza Bahia','Casa',               230.00, v_due, false, true, v_month),
    (v_uid, 'Luz',                     'Casa',               180.00, v_due, true,  true, v_month),
    (v_uid, 'Luz mãe',                 'Casa',               297.00, v_due, true,  true, v_month),
    (v_uid, 'Mercado',                 'Casa',               400.00, v_due, true,  true, v_month),
    (v_uid, 'Faculdade Mãe',           'Educação',           253.10, v_due, true,  true, v_month),
    (v_uid, 'Simples Nacional',        'Impostos',          2500.00, v_due, true,  true, v_month),
    (v_uid, 'Plano de saúde',          'Saúde',              900.00, v_due, true,  true, v_month),
    (v_uid, 'Água casa',               'Casa',                90.00, v_due, true,  true, v_month),
    (v_uid, 'Associacao Canta Galo',   'Casa',               120.00, v_due, true,  true, v_month),
    (v_uid, 'Duo Gourmet',             'Cartão de crédito',   45.00, v_due, true,  true, v_month),
    (v_uid, 'IPTU',                    'Casa',                85.00, v_due, true,  true, v_month),
    (v_uid, 'Limpeza',                 'Casa',               175.00, v_due, true,  true, v_month),
    (v_uid, 'Parcela Carro',           'Carro',             2257.00, v_due, true,  true, v_month),
    (v_uid, 'Seguro Carro',            'Carro',              135.00, v_due, true,  true, v_month),
    (v_uid, 'Nomad',                   'Cartão de crédito', 1190.00, v_due, true,  true, v_month);

  raise notice 'Inseridas 25 despesas fixas em set/2026 para %', v_email;
end $$;

-- ──────────────────────────────────────────────────────────────────
--  Para APAGAR as despesas de set/2026 (caso precise refazer o seed):
--
--  delete from public.expenses
--  where ref_month = '2026-09-01'
--    and user_id = (select id from auth.users where email = 'thaislino2@gmail.com');
-- ──────────────────────────────────────────────────────────────────
