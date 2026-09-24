-- ══════════════════════════════════════════════════════════════════
--  Migration 016: anamnese completa + controle de onboarding
--
--  Expande dietary_profile (uma linha por usuário) para suportar um
--  onboarding em etapas com dois modos (básico / completo), salvamento
--  parcial ("salvar e continuar depois") e os blocos A–H da anamnese
--  nutricional. Idempotente — cada coluna usa "add column if not exists".
--
--  Estratégia de tipos:
--   • O que o cálculo/IA consome direto → coluna tipada (sexo, idade,
--     altura, peso, objetivo, nº de refeições).
--   • Blocos com muitos subcampos de texto livre (histórico clínico,
--     rotina esportiva dia-a-dia, exames) → jsonb, pra não explodir a
--     tabela em dezenas de colunas raramente preenchidas.
--   • "não sei / não tenho" é registrado como a string '__lacuna__' no
--     campo, pra distinguir de "não respondido" (null) e virar LACUNA
--     no plano depois.
-- ══════════════════════════════════════════════════════════════════

-- ── Controle do onboarding ──────────────────────────────────────────
alter table public.dietary_profile add column if not exists onboarding_mode        text;         -- 'basico' | 'completo'
alter table public.dietary_profile add column if not exists onboarding_step        int  not null default 0;  -- último passo salvo (retomada)
alter table public.dietary_profile add column if not exists onboarding_completed_at timestamptz; -- null enquanto não concluído

-- ── Bloco A — Antropometria e identificação ─────────────────────────
alter table public.dietary_profile add column if not exists sex                 text;          -- 'feminino' | 'masculino'
alter table public.dietary_profile add column if not exists age                 int;
alter table public.dietary_profile add column if not exists height_cm           numeric(5,1);
alter table public.dietary_profile add column if not exists weight_kg           numeric(5,1);
alter table public.dietary_profile add column if not exists body_fat_pct        numeric(4,1);
alter table public.dietary_profile add column if not exists body_fat_method     text;          -- dexa | bioimpedancia | dobras | estimativa
alter table public.dietary_profile add column if not exists weight_trend        text;          -- subindo | estavel | caindo
alter table public.dietary_profile add column if not exists waist_cm            numeric(5,1);

-- ── Bloco B — Histórico (clínico/esportivo, em jsonb) ───────────────
--  family_history, personal_conditions, medications, ed_history,
--  sports_history, strength_years, pregnancy, labs
alter table public.dietary_profile add column if not exists history            jsonb not null default '{}'::jsonb;

-- ── Bloco C — Meta ──────────────────────────────────────────────────
alter table public.dietary_profile add column if not exists goal_primary        text;          -- hipertrofia | perda_gordura | recomposicao | desempenho | saude
alter table public.dietary_profile add column if not exists goal_constraints    text;          -- restrições estéticas/conforto (texto livre)
alter table public.dietary_profile add column if not exists goal_deadline       text;          -- prazo / evento-alvo
alter table public.dietary_profile add column if not exists goal_target         text;          -- meta de peso/composição

-- ── Bloco D — Rotina esportiva (jsonb) ──────────────────────────────
--  weekly_routine[], optional_sessions, strength_detail, neat, sleep_hours,
--  sleep_quality
alter table public.dietary_profile add column if not exists sport_routine      jsonb not null default '{}'::jsonb;

-- ── Bloco E — Rotina de nutrição atual (jsonb) ──────────────────────
--  typical_day, meals_windows, current_calories, alcohol, caffeine, water,
--  current_supplements
alter table public.dietary_profile add column if not exists current_nutrition  jsonb not null default '{}'::jsonb;
alter table public.dietary_profile add column if not exists meals_per_day       int;           -- nº de refeições viável (usado no BÁSICO tb)

-- ── Bloco F — Viabilidade (parte já existia; complementa) ───────────
--  diet_style, restrictions, dislikes já existem da migration 009.
alter table public.dietary_profile add column if not exists cooking_time        text;          -- tempo/habilidade de cozinhar
alter table public.dietary_profile add column if not exists eats_out            text;          -- come fora quantas vezes/semana
alter table public.dietary_profile add column if not exists has_work_kitchen    boolean;       -- cozinha/geladeira no trabalho
alter table public.dietary_profile add column if not exists budget              text;          -- limite de orçamento

-- ── Bloco G — Referência a confrontar ───────────────────────────────
alter table public.dietary_profile add column if not exists ref_tmb_tdee        text;          -- TMB/TDEE que o usuário já tem + fonte

-- ── Bloco H — Insumos opcionais (jsonb: quais anexos disponíveis) ───
alter table public.dietary_profile add column if not exists inputs_available   jsonb not null default '{}'::jsonb;

-- (as colunas da 009 permanecem: diet_style, restrictions, dislikes,
--  preferred_carbs, preferred_proteins, preferred_breakfast,
--  variety_level, notes — reaproveitadas pelo bloco Básico/F.)

-- RLS já está ativa e correta na tabela (migrations 009 + 014). Nada a
-- alterar em políticas aqui — só colunas novas.
