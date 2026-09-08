-- ══════════════════════════════════════════════════════════════════
--  Migration: módulo Nutrição (diário, metas, cardápio, compras, medidas)
--  Independente dos demais módulos. Idempotente.
-- ══════════════════════════════════════════════════════════════════

-- METAS nutricionais (uma linha por usuário; upsert)
create table if not exists public.nutrition_goals (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  calories     integer not null default 2000,
  protein_g    integer not null default 120,
  carbs_g      integer not null default 200,
  fat_g        integer not null default 60,
  goal_type    text not null default 'manutencao', -- cutting | manutencao | bulking
  updated_at   timestamptz not null default now()
);

-- DIÁRIO alimentar (o que foi comido)
create table if not exists public.food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  log_date    date not null default current_date,
  meal        text not null default 'Almoço',  -- Café, Almoço, Lanche, Jantar, Ceia
  description text not null,                    -- "Arroz, feijão, frango"
  calories    numeric(8,2) not null default 0,
  protein_g   numeric(8,2) not null default 0,
  carbs_g     numeric(8,2) not null default 0,
  fat_g       numeric(8,2) not null default 0,
  source      text not null default 'manual',   -- manual | ai
  created_at  timestamptz not null default now()
);

-- CARDÁPIO semanal (o que se pretende comer)
create table if not exists public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_start  date not null,                    -- segunda-feira
  weekday     smallint not null default 0,      -- 0=Seg ... 6=Dom
  meal        text not null default 'Almoço',
  description text not null,
  calories    numeric(8,2) not null default 0,
  source      text not null default 'manual',
  created_at  timestamptz not null default now()
);

-- LISTA DE COMPRAS
create table if not exists public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  quantity    text,                             -- "2 kg", "1 dúzia"
  category    text not null default 'Outros',   -- Hortifruti, Proteínas, Laticínios...
  bought      boolean not null default false,
  source      text not null default 'manual',
  created_at  timestamptz not null default now()
);

-- MEDIDAS corporais / peso ao longo do tempo
create table if not exists public.body_measurements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  measured_at   date not null default current_date,
  weight_kg     numeric(6,2),
  body_fat_pct  numeric(5,2),
  waist_cm      numeric(6,2),
  hip_cm        numeric(6,2),
  chest_cm      numeric(6,2),
  arm_cm        numeric(6,2),
  thigh_cm      numeric(6,2),
  notes         text,
  created_at    timestamptz not null default now()
);

-- índices
create index if not exists idx_food_logs_user_date   on public.food_logs (user_id, log_date);
create index if not exists idx_meal_plans_user_week  on public.meal_plans (user_id, week_start);
create index if not exists idx_shopping_user         on public.shopping_items (user_id);
create index if not exists idx_measurements_user     on public.body_measurements (user_id, measured_at);

-- RLS
alter table public.nutrition_goals   enable row level security;
alter table public.food_logs         enable row level security;
alter table public.meal_plans        enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.body_measurements enable row level security;

do $$
declare t text;
begin
  foreach t in array array['nutrition_goals','food_logs','meal_plans','shopping_items','body_measurements']
  loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s;', t);
    execute format('create policy "%1$s_select_own" on public.%1$s for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', t);
    execute format('create policy "%1$s_update_own" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', t);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
