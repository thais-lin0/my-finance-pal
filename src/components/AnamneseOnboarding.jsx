import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Save,
  ClipboardList,
  Zap,
  Pencil,
  CircleHelp,
  CalendarRange,
  UtensilsCrossed,
  Target,
  PartyPopper,
} from 'lucide-react'
import { useDietaryProfile } from '../hooks/useNutrition'
import NextSteps from './NextSteps'
import PlanAnalysis from './PlanAnalysis'

// ─────────────────────────────────────────────────────────────────────
//  Onboarding da anamnese nutricional.
//  Dois modos: BÁSICO (5 campos essenciais pra IA funcionar) e COMPLETO
//  (blocos A–H do protocolo). Wizard multi-etapa com barra de progresso,
//  "salvar e continuar depois" (persiste parcial a cada passo), retomada
//  automática no passo salvo, e opcionais que aceitam "não sei/não tenho"
//  (registrados como '__lacuna__' pra virar LACUNA no plano depois).
// ─────────────────────────────────────────────────────────────────────

export const LACUNA = '__lacuna__'

const card =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900'
const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'
const labelCls = 'text-xs font-medium text-slate-500 dark:text-slate-400'

const DIET_STYLES = [
  ['sem_restricao', 'Sem restrição'],
  ['vegetariano', 'Vegetariano'],
  ['vegano', 'Vegano'],
  ['low_carb', 'Low carb'],
  ['cetogenica', 'Cetogênica'],
  ['outro', 'Outro'],
]

const GOALS = [
  ['hipertrofia', 'Hipertrofia (ganhar músculo)'],
  ['perda_gordura', 'Perda de gordura'],
  ['recomposicao', 'Recomposição corporal'],
  ['desempenho', 'Desempenho esportivo'],
  ['saude', 'Saúde / manutenção'],
]

// Campos que compõem cada modo. O básico é um subconjunto do completo.
const EMPTY = {
  onboarding_mode: null,
  // Bloco A
  sex: '',
  age: '',
  height_cm: '',
  weight_kg: '',
  body_fat_pct: '',
  body_fat_method: '',
  weight_trend: '',
  waist_cm: '',
  // Bloco B (jsonb)
  history: {},
  // Bloco C
  goal_primary: '',
  goal_constraints: '',
  goal_deadline: '',
  goal_target: '',
  // Bloco D (jsonb)
  sport_routine: {},
  // Bloco E (jsonb + coluna)
  current_nutrition: {},
  meals_per_day: '',
  // Bloco F
  diet_style: 'sem_restricao',
  restrictions: '',
  dislikes: '',
  preferred_carbs: '',
  preferred_proteins: '',
  preferred_breakfast: '',
  variety_level: 'equilibrado',
  cooking_time: '',
  eats_out: '',
  has_work_kitchen: null,
  budget: '',
  // Bloco G
  ref_tmb_tdee: '',
  // Bloco H (jsonb)
  inputs_available: {},
  notes: '',
}

function hydrate(profile) {
  const p = profile ?? {}
  return {
    ...EMPTY,
    ...Object.fromEntries(
      Object.keys(EMPTY).map((k) => {
        const v = p[k]
        if (v === null || v === undefined) return [k, EMPTY[k]]
        return [k, v]
      }),
    ),
    history: p.history ?? {},
    sport_routine: p.sport_routine ?? {},
    current_nutrition: p.current_nutrition ?? {},
    inputs_available: p.inputs_available ?? {},
  }
}

// Converte "" -> null pra não gravar string vazia; mantém 0 e LACUNA.
function clean(form) {
  const out = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === '') out[k] = null
    else out[k] = v
  }
  return out
}

// ── Campo de texto que aceita marcar "não sei / não tenho" (lacuna) ──
function GapField({ label, value, onChange, placeholder, optional, textarea, type }) {
  const isGap = value === LACUNA
  return (
    <label className={`block ${labelCls}`}>
      <span className="flex items-center gap-1">
        {label}
        {optional && <span className="text-[10px] font-normal text-slate-400">(opcional)</span>}
      </span>
      {textarea ? (
        <textarea
          rows={2}
          disabled={isGap}
          placeholder={placeholder}
          value={isGap ? '' : value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} mt-1 w-full resize-none ${isGap ? 'opacity-40' : ''}`}
        />
      ) : (
        <input
          type={type || 'text'}
          disabled={isGap}
          placeholder={placeholder}
          value={isGap ? '' : value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} mt-1 w-full ${isGap ? 'opacity-40' : ''}`}
        />
      )}
      {optional && (
        <button
          type="button"
          onClick={() => onChange(isGap ? '' : LACUNA)}
          className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition ${
            isGap
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <CircleHelp size={11} /> {isGap ? 'marcado como “não sei” — desmarcar' : 'não sei / não tenho'}
        </button>
      )}
    </label>
  )
}

export default function AnamneseOnboarding({ onNavigate }) {
  const { profile, loading, saveProgress, markComplete } = useDietaryProfile()
  const [form, setForm] = useState(null)
  const [step, setStep] = useState(0)
  const [savedAt, setSavedAt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [justFinished, setJustFinished] = useState(false)

  const completed = !!profile?.onboarding_completed_at

  useEffect(() => {
    if (!loading && !form) {
      setForm(hydrate(profile))
      setStep(profile?.onboarding_step ?? 0)
    }
  }, [loading, profile, form])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setJson = (bucket, key, val) =>
    setForm((f) => ({ ...f, [bucket]: { ...(f[bucket] ?? {}), [key]: val } }))

  // Define os passos conforme o modo escolhido.
  const steps = useMemo(() => (form ? buildSteps(form, set, setJson) : []), [form])

  if (loading || !form) return null

  // ── Tela de escolha de modo (quando ainda não escolheu e não concluiu) ──
  if (!form.onboarding_mode && !completed) {
    return <ModePicker onPick={(mode) => { set({ onboarding_mode: mode }); setStep(0); saveProgress({ onboarding_mode: mode }, 0) }} />
  }

  // ── Concluído e não editando: celebração (se acabou agora) ou resumo, ambos com próximos passos ──
  if (completed && !editing) {
    return (
      <Summary
        profile={profile}
        celebrate={justFinished}
        onNavigate={onNavigate}
        onEdit={() => { setEditing(true); setJustFinished(false); setStep(0) }}
      />
    )
  }

  const total = steps.length
  const current = steps[Math.min(step, total - 1)]
  const pct = Math.round(((step + 1) / total) * 100)

  const persist = async (goStep) => {
    setSaving(true)
    try {
      await saveProgress(clean(form), goStep ?? step)
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  const next = async () => {
    if (step < total - 1) {
      const n = step + 1
      setStep(n)
      await persist(n)
    } else {
      // último passo: concluir
      setSaving(true)
      try {
        await markComplete(clean(form))
        setEditing(false)
        setJustFinished(true)
      } finally {
        setSaving(false)
      }
    }
  }
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="space-y-4">
      {/* Barra de progresso */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              {form.onboarding_mode === 'completo' ? <ClipboardList size={15} /> : <Zap size={15} />}
              {form.onboarding_mode === 'completo' ? 'Anamnese completa' : 'Perfil básico'}
              <span className="text-slate-400">· {current.title}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Passo {step + 1} de {total}
            </p>
          </div>
          <span className="text-lg font-bold text-brand-500">{pct}%</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Conteúdo do passo */}
      <div className={`${card} space-y-4`}>
        {current.hint && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-ink-800 dark:text-slate-400">
            {current.hint}
          </p>
        )}
        {current.body}
      </div>

      {/* Navegação */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40 dark:border-ink-700 dark:text-slate-300"
        >
          <ChevronLeft size={16} /> Voltar
        </button>

        <button
          type="button"
          onClick={() => persist()}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40 dark:border-ink-700 dark:text-slate-300"
        >
          <Save size={15} /> Salvar e continuar depois
        </button>

        <button
          type="button"
          onClick={next}
          disabled={saving}
          className="ml-auto flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {step < total - 1 ? (
            <>Próximo <ChevronRight size={16} /></>
          ) : (
            <><Check size={16} /> Concluir</>
          )}
        </button>
      </div>

      {savedAt && (
        <p className="text-right text-xs text-money">
          ✓ progresso salvo — pode fechar e continuar quando quiser
        </p>
      )}
    </div>
  )
}

// ── Escolha de modo ──────────────────────────────────────────────────
function ModePicker({ onPick }) {
  return (
    <div className="space-y-4">
      <div className={`${card} border-2 border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20`}>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
          <Sparkles size={15} /> Vamos montar seu perfil nutricional
        </p>
        <p className="mt-1 text-sm text-brand-700/80 dark:text-brand-300/80">
          É isso que a IA usa pra montar cardápio, analisar refeições e calcular suas metas do SEU jeito.
          Escolha a profundidade — dá pra salvar e continuar depois a qualquer momento, e trocar de modo
          quando quiser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick('basico')}
          className={`${card} text-left transition hover:border-brand-400 hover:shadow-lg`}
        >
          <p className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white">
            <Zap size={17} className="text-brand-500" /> Básico
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            5 perguntas essenciais. O suficiente pra IA já montar cardápio e metas. Leva ~1 minuto.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Estilo alimentar · restrições · o que evita · objetivo · nº de refeições
          </p>
        </button>

        <button
          type="button"
          onClick={() => onPick('completo')}
          className={`${card} text-left transition hover:border-brand-400 hover:shadow-lg`}
        >
          <p className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white">
            <ClipboardList size={17} className="text-brand-500" /> Completo
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Anamnese completa: antropometria, histórico clínico e esportivo, rotina de treino, viabilidade
            e insumos. Pra um plano individualizado de verdade.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Tudo do básico + blocos A–H · ~8 passos · pode pausar
          </p>
        </button>
      </div>
    </div>
  )
}

// ── Conclusão: celebração (recém-concluído) ou resumo, sempre com próximos passos ──
function Summary({ profile, onEdit, onNavigate, celebrate }) {
  const rows = [
    ['Objetivo', labelForGoal(profile.goal_primary)],
    ['Estilo alimentar', labelForDiet(profile.diet_style)],
    ['Refeições/dia', profile.meals_per_day],
    ['Restrições', gapText(profile.restrictions)],
    ['Evita', gapText(profile.dislikes)],
    ['Sexo / idade', [profile.sex, profile.age && `${profile.age} anos`].filter(Boolean).join(' · ')],
    ['Altura / peso', [profile.height_cm && `${profile.height_cm} cm`, profile.weight_kg && `${profile.weight_kg} kg`].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v != null && v !== '')

  const go = (tab, opts) => onNavigate?.(tab, opts)

  const steps = [
    {
      icon: CalendarRange,
      title: 'Gerar meu cardápio da semana',
      description: 'A IA já tem seu perfil — monta o cardápio dos 7 dias na hora.',
      cta: 'Gerar agora',
      tone: 'brand',
      onClick: () => go('cardapio', { autoGeneratePlan: true }),
    },
    {
      icon: UtensilsCrossed,
      title: 'Registrar minha primeira refeição',
      description: 'Descreva o que comeu e a IA calcula as calorias e macros.',
      cta: 'Abrir Diário',
      tone: 'brand',
      onClick: () => go('diario'),
    },
    {
      icon: Target,
      title: 'Calcular minhas metas do dia',
      description: 'Calorias e macros personalizados a partir do seu perfil.',
      cta: 'Ver metas',
      tone: 'brand',
      onClick: () => go('diario', { openGoals: true }),
    },
  ]

  return (
    <div className="space-y-5">
      {celebrate ? (
        <div className={`${card} border-2 border-money/30 bg-money/5 text-center`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-money/15 text-money">
            <PartyPopper size={28} />
          </div>
          <p className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
            Perfil pronto! 🎉
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            A IA já está usando seus dados para personalizar tudo. Escolha por onde começar —
            é só um clique.
          </p>
        </div>
      ) : (
        <div className={`${card} border border-money/30 bg-money/5`}>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-money">
            <Check size={15} /> Perfil preenchido
            <span className="font-normal text-slate-500 dark:text-slate-400">
              · modo {profile.onboarding_mode === 'completo' ? 'completo' : 'básico'}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A IA já está usando esses dados. Comece por um dos passos abaixo ou revise seu perfil.
          </p>
        </div>
      )}

      {/* Próximos passos — o "e agora?" resolvido */}
      <NextSteps
        title="O que fazer agora"
        subtitle="Seu perfil alimenta cada uma destas ações."
        steps={steps}
      />

      {/* Análise nutricional individualizada (IA) + exportar PDF */}
      <div className="border-t border-slate-100 pt-5 dark:border-ink-800">
        <PlanAnalysis />
      </div>

      {/* Resumo do perfil */}
      <div className={`${card} space-y-2`}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Seu perfil</p>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-slate-50 py-1.5 text-sm last:border-0 dark:border-ink-800">
            <span className="text-slate-500 dark:text-slate-400">{k}</span>
            <span className="text-right font-medium text-slate-800 dark:text-slate-200">{v}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-ink-700 dark:text-slate-300 dark:hover:bg-ink-800"
      >
        <Pencil size={15} /> Editar / aprofundar perfil
      </button>
    </div>
  )
}

function gapText(v) {
  if (v === LACUNA) return '— não informado —'
  return v || null
}
function labelForGoal(v) {
  return GOALS.find(([k]) => k === v)?.[1] ?? null
}
function labelForDiet(v) {
  return DIET_STYLES.find(([k]) => k === v)?.[1] ?? null
}

// ── Construção dos passos por modo ───────────────────────────────────
function buildSteps(form, set, setJson) {
  const isFull = form.onboarding_mode === 'completo'

  // ---- Blocos reutilizados ----
  const goalStep = {
    title: 'Objetivo',
    hint: 'Seu objetivo principal orienta calorias e macros.',
    body: (
      <div className="space-y-2">
        <p className={labelCls}>Objetivo principal</p>
        {GOALS.map(([value, label]) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
              form.goal_primary === value
                ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                : 'border-slate-200 text-slate-500 dark:border-ink-700 dark:text-slate-400'
            }`}
          >
            <input type="radio" name="goal" checked={form.goal_primary === value} onChange={() => set({ goal_primary: value })} className="accent-brand-500" />
            {label}
          </label>
        ))}
      </div>
    ),
  }

  const dietStep = {
    title: 'Estilo & restrições',
    hint: 'A IA respeita integralmente restrições e aversões ao montar cardápio.',
    body: (
      <div className="space-y-4">
        <div>
          <p className={labelCls}>Estilo alimentar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIET_STYLES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set({ diet_style: value })}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  form.diet_style === value
                    ? 'bg-brand-500 text-white shadow-card'
                    : 'border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-ink-700 dark:text-slate-400 dark:hover:bg-ink-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GapField label="Restrições / alergias / intolerâncias" placeholder="Ex: sem lactose, alergia a camarão" value={form.restrictions} onChange={(v) => set({ restrictions: v })} textarea />
          <GapField label="Alimentos que não gosta / evita" placeholder="Ex: peixe, quiabo, muito apimentado" value={form.dislikes} onChange={(v) => set({ dislikes: v })} textarea />
        </div>
      </div>
    ),
  }

  const mealsStep = {
    title: 'Refeições',
    hint: 'Quantas refeições você consegue fazer num dia real, e o que gosta em cada base.',
    body: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={`block ${labelCls}`}>
          Nº de refeições por dia
          <input type="number" min="1" max="8" placeholder="Ex: 4" value={form.meals_per_day ?? ''} onChange={(e) => set({ meals_per_day: e.target.value })} className={`${inputCls} mt-1 w-full`} />
        </label>
        <GapField label="Nível de variedade" optional placeholder="simples / equilibrado / variado" value={form.variety_level} onChange={(v) => set({ variety_level: v })} />
        <GapField label="Carboidratos preferidos" optional placeholder="Ex: arroz, batata-doce" value={form.preferred_carbs} onChange={(v) => set({ preferred_carbs: v })} />
        <GapField label="Proteínas preferidas" optional placeholder="Ex: frango, patinho, ovos" value={form.preferred_proteins} onChange={(v) => set({ preferred_proteins: v })} />
        <GapField label="Café da manhã de preferência" optional placeholder="Ex: pão + ovos + fruta" value={form.preferred_breakfast} onChange={(v) => set({ preferred_breakfast: v })} />
      </div>
    ),
  }

  // ---- BÁSICO: só o essencial ----
  if (!isFull) {
    return [goalStep, dietStep, mealsStep]
  }

  // ---- COMPLETO: blocos A–H ----
  const anthroStep = {
    title: 'A · Antropometria',
    hint: 'Base da equação de metabolismo. Percentual de gordura e cintura são opcionais.',
    body: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={`block ${labelCls}`}>
          Sexo biológico
          <select value={form.sex ?? ''} onChange={(e) => set({ sex: e.target.value })} className={`${inputCls} mt-1 w-full`}>
            <option value="">Selecione</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
        </label>
        <label className={`block ${labelCls}`}>
          Idade
          <input type="number" placeholder="anos" value={form.age ?? ''} onChange={(e) => set({ age: e.target.value })} className={`${inputCls} mt-1 w-full`} />
        </label>
        <label className={`block ${labelCls}`}>
          Altura (cm)
          <input type="number" placeholder="Ex: 172" value={form.height_cm ?? ''} onChange={(e) => set({ height_cm: e.target.value })} className={`${inputCls} mt-1 w-full`} />
        </label>
        <label className={`block ${labelCls}`}>
          Peso atual (kg)
          <input type="number" placeholder="Ex: 60" value={form.weight_kg ?? ''} onChange={(e) => set({ weight_kg: e.target.value })} className={`${inputCls} mt-1 w-full`} />
        </label>
        <GapField label="% de gordura corporal" optional type="number" placeholder="Ex: 22" value={form.body_fat_pct} onChange={(v) => set({ body_fat_pct: v })} />
        <label className={`block ${labelCls}`}>
          Como mediu o % gordura
          <select value={form.body_fat_method ?? ''} onChange={(e) => set({ body_fat_method: e.target.value })} className={`${inputCls} mt-1 w-full`}>
            <option value="">—</option>
            <option value="dexa">DEXA</option>
            <option value="bioimpedancia">Bioimpedância</option>
            <option value="dobras">Dobras cutâneas</option>
            <option value="estimativa">Estimativa</option>
          </select>
        </label>
        <label className={`block ${labelCls}`}>
          Tendência de peso (12 meses)
          <select value={form.weight_trend ?? ''} onChange={(e) => set({ weight_trend: e.target.value })} className={`${inputCls} mt-1 w-full`}>
            <option value="">—</option>
            <option value="subindo">Subindo</option>
            <option value="estavel">Estável</option>
            <option value="caindo">Caindo</option>
          </select>
        </label>
        <GapField label="Circunferência de cintura (cm)" optional type="number" placeholder="Ex: 72" value={form.waist_cm} onChange={(v) => set({ waist_cm: v })} />
      </div>
    ),
  }

  const historyStep = {
    title: 'B · Histórico',
    hint: 'Histórico clínico e esportivo. Tudo aqui é opcional — o que não souber, marque como lacuna.',
    body: (
      <div className="space-y-4">
        <GapField label="Histórico familiar (obesidade, diabetes, tireoide, cardiovascular, renal…)" optional textarea value={form.history.family} onChange={(v) => setJson('history', 'family', v)} />
        <GapField label="Condições atuais (diabetes, SOP, tireoide, hipertensão, refluxo, anemia…)" optional textarea value={form.history.personal} onChange={(v) => setJson('history', 'personal', v)} />
        <GapField label="Medicamentos e suplementos em uso" optional textarea value={form.history.medications} onChange={(v) => setJson('history', 'medications', v)} />
        <GapField label="Histórico de transtorno alimentar / dieta restritiva / efeito sanfona" optional textarea value={form.history.ed} onChange={(v) => setJson('history', 'ed', v)} />
        <GapField label="Histórico esportivo (desde quando treina, modalidades, lesões)" optional textarea value={form.history.sports} onChange={(v) => setJson('history', 'sports', v)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GapField label="Anos de treino de força consistente" optional type="number" placeholder="Ex: 3" value={form.history.strength_years} onChange={(v) => setJson('history', 'strength_years', v)} />
          <GapField label="Gestação / pós-parto / amamentação" optional placeholder="Se aplicável" value={form.history.pregnancy} onChange={(v) => setJson('history', 'pregnancy', v)} />
        </div>
      </div>
    ),
  }

  const routineStep = {
    title: 'D · Rotina esportiva',
    hint: 'Treino da semana e nível de atividade. Séries de força têm mais peso na hipertrofia que o gasto calórico.',
    body: (
      <div className="space-y-4">
        <GapField label="Rotina semanal, dia por dia (modalidade, duração, intensidade)" optional textarea value={form.sport_routine.weekly} onChange={(v) => setJson('sport_routine', 'weekly', v)} placeholder="Ex: Seg corrida 6km; Ter+Qui musculação; Sex pilates+natação…" />
        <GapField label="Sessões opcionais / variáveis (ex: bike só às vezes)" optional textarea value={form.sport_routine.optional} onChange={(v) => setJson('sport_routine', 'optional', v)} />
        <GapField label="Treino de força: séries semanais por grupo e se progride carga" optional textarea value={form.sport_routine.strength} onChange={(v) => setJson('sport_routine', 'strength', v)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GapField label="Atividade fora do treino (sentado/em pé, passos/dia)" optional value={form.sport_routine.neat} onChange={(v) => setJson('sport_routine', 'neat', v)} />
          <GapField label="Sono (horas médias e qualidade)" optional value={form.sport_routine.sleep} onChange={(v) => setJson('sport_routine', 'sleep', v)} />
        </div>
      </div>
    ),
  }

  const currentNutriStep = {
    title: 'E · Nutrição atual',
    hint: 'O que você já come hoje e o que consome de líquidos/suplementos.',
    body: (
      <div className="space-y-4">
        <GapField label="O que come num dia típico, com horários" optional textarea value={form.current_nutrition.typical} onChange={(v) => setJson('current_nutrition', 'typical', v)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GapField label="Janelas de horário reais das refeições" optional value={form.current_nutrition.windows} onChange={(v) => setJson('current_nutrition', 'windows', v)} />
          <GapField label="Ingestão calórica atual (se acompanha em app)" optional value={form.current_nutrition.calories} onChange={(v) => setJson('current_nutrition', 'calories', v)} />
          <GapField label="Álcool / cafeína / água" optional value={form.current_nutrition.drinks} onChange={(v) => setJson('current_nutrition', 'drinks', v)} />
          <GapField label="Suplementos atuais (whey, creatina, vitaminas)" optional value={form.current_nutrition.supplements} onChange={(v) => setJson('current_nutrition', 'supplements', v)} />
        </div>
      </div>
    ),
  }

  const viabilityStep = {
    title: 'F · Viabilidade',
    hint: 'Sem isso o cardápio vira fantasia. Tempo, orçamento e onde você come importam.',
    body: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GapField label="Tempo / habilidade pra cozinhar" optional value={form.cooking_time} onChange={(v) => set({ cooking_time: v })} placeholder="Ex: pouco tempo, cozinho no fim de semana" />
        <GapField label="Come fora quantas vezes/semana" optional value={form.eats_out} onChange={(v) => set({ eats_out: v })} placeholder="Ex: 2-3 almoços fora" />
        <label className={`block ${labelCls}`}>
          Tem cozinha/geladeira no trabalho?
          <select value={form.has_work_kitchen === null ? '' : form.has_work_kitchen ? 'sim' : 'nao'} onChange={(e) => set({ has_work_kitchen: e.target.value === '' ? null : e.target.value === 'sim' })} className={`${inputCls} mt-1 w-full`}>
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
        <GapField label="Limite de orçamento (alimentação/suplementos)" optional value={form.budget} onChange={(v) => set({ budget: v })} />
      </div>
    ),
  }

  const refInputsStep = {
    title: 'G/H · Referências & insumos',
    hint: 'Valores que você já tenha e quais anexos existem. A IA recalcula por conta própria e confronta.',
    body: (
      <div className="space-y-4">
        <GapField label="TMB/TDEE que você já tem (calculadora, app, nutri) + fonte" optional textarea value={form.ref_tmb_tdee} onChange={(v) => set({ ref_tmb_tdee: v })} />
        <p className={labelCls}>Insumos disponíveis (marque o que tem — anexo é opcional):</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ['prev_plan', 'Plano alimentar anterior'],
            ['watch', 'Export de relógio / app de atividade'],
            ['labs', 'Exames laboratoriais'],
            ['calorie_app', 'Export de app de contagem de calorias'],
            ['body_assessment', 'Avaliação física / bioimpedância'],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-ink-700">
              <input type="checkbox" checked={!!form.inputs_available[key]} onChange={(e) => setJson('inputs_available', key, e.target.checked)} className="accent-brand-500" />
              {label}
            </label>
          ))}
        </div>
        <GapField label="Observações livres (qualquer outra coisa que a IA deva saber)" optional textarea value={form.notes} onChange={(v) => set({ notes: v })} />
      </div>
    ),
  }

  return [
    goalStep,       // C
    anthroStep,     // A
    historyStep,    // B
    routineStep,    // D
    currentNutriStep, // E
    dietStep,       // F (estilo/restrições)
    viabilityStep,  // F (viabilidade)
    mealsStep,      // E/F (refeições e preferências)
    refInputsStep,  // G/H
  ]
}
