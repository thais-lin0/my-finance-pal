import { useEffect, useState } from 'react'
import {
  UtensilsCrossed,
  CalendarRange,
  ShoppingCart,
  Ruler,
  Sparkles,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Target,
  Coffee,
  Cookie,
  Moon,
  Soup,
  Settings,
  Flame,
  Footprints,
} from 'lucide-react'
import { useWeek } from '../context/WeekContext'
import { useAgenda } from '../hooks/useAgenda'
import {
  useNutritionDay,
  useMealPlan,
  useShopping,
  useMeasurements,
  useBodyGoals,
  useDietaryProfile,
  useHealthDay,
  computeWeightProgress,
  MEALS,
  DEFAULT_MEAL_SPLIT,
  SHOPPING_CATEGORIES,
} from '../hooks/useNutrition'
import { callNutritionAI } from '../lib/nutritionAI'
import { todayKey, addDays, formatDateBR, weekLabel, WEEKDAYS_SHORT } from '../lib/format'
import MacroProgress from '../components/MacroProgress'
import WeightChart from '../components/WeightChart'
import Sparkline from '../components/Sparkline'
import AnamneseOnboarding from '../components/AnamneseOnboarding'

const TABS = [
  { id: 'diario', label: 'Diário', icon: UtensilsCrossed },
  { id: 'cardapio', label: 'Cardápio & Compras', icon: CalendarRange },
  { id: 'medidas', label: 'Medidas', icon: Ruler },
  { id: 'preferencias', label: 'Preferências', icon: Settings },
]

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900'

export default function NutricaoPage() {
  const [tab, setTab] = useState('diario')
  const dietary = useDietaryProfile()
  const [checkedFirstAccess, setCheckedFirstAccess] = useState(false)
  // Onboarding concluído? Um perfil parcial (salvo no meio do wizard) já
  // cria a linha, então o sinal certo é a data de conclusão, não a mera
  // existência da linha.
  const onboardingDone = !!dietary.profile?.onboarding_completed_at

  // Primeiro acesso: se a pessoa ainda não concluiu o perfil alimentar,
  // abre direto em Preferências em vez de Diário. Só uma vez — depois
  // que carrega, não fica puxando de volta se ela navegar pra outra aba.
  useEffect(() => {
    if (!dietary.loading && !checkedFirstAccess) {
      if (!onboardingDone) setTab('preferencias')
      setCheckedFirstAccess(true)
    }
  }, [dietary.loading, onboardingDone, checkedFirstAccess])

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Saúde e alimentação</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Nutrição</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === id
                ? 'bg-brand-500 text-white shadow-card'
                : 'border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-ink-700 dark:text-slate-400 dark:hover:bg-ink-800'
            }`}
          >
            <Icon size={16} /> {label}
            {id === 'preferencias' && checkedFirstAccess && !onboardingDone && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-coral" />
            )}
          </button>
        ))}
      </div>

      {tab === 'diario' && <DiarioTab />}
      {tab === 'cardapio' && <CardapioTab />}
      {tab === 'medidas' && <MedidasTab />}
      {tab === 'preferencias' && <PreferenciasTab />}
    </div>
  )
}

// ─────────────────────── RESUMO DE METAS (topo do Diário) ───────────────────────
function GoalSummary() {
  const m = useMeasurements()
  const { goals } = useBodyGoals()
  const prog = computeWeightProgress(m.items, goals)

  // sparkline dos últimos registros de peso
  const spark = m.items
    .filter((x) => x.weight_kg != null)
    .slice(-12)
    .map((x) => ({ v: Number(x.weight_kg) }))

  const s = m.stats

  // se não há meta nem medição, mostra um convite discreto
  if (!goals?.target_weight && !s.current) {
    return (
      <div className={`${card} flex items-center justify-between`}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Defina uma meta de peso e registre suas medidas na aba <strong>Medidas</strong> para acompanhar aqui.
        </p>
      </div>
    )
  }

  const fmtKg = (v) => (v == null ? '—' : `${Number(v).toFixed(1)} kg`)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* peso atual + sparkline */}
      <div className={card}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Peso atual</p>
        <p className="mt-1 font-display text-2xl font-bold tnum text-slate-900 dark:text-white">{fmtKg(s.current)}</p>
        <div className="mt-1">
          <Sparkline data={spark} color="#0fa968" />
        </div>
      </div>

      {/* meta */}
      <div className={card}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Meta de peso</p>
        <p className="mt-1 font-display text-2xl font-bold tnum text-brand-600 dark:text-brand-300">
          {goals?.target_weight ? fmtKg(goals.target_weight) : '—'}
        </p>
        {prog && (
          <p className="mt-1 text-xs text-slate-400">
            {prog.reached ? '🎉 meta atingida' : `faltam ${Math.abs(prog.remaining).toFixed(1)} kg`}
          </p>
        )}
      </div>

      {/* progresso rumo à meta */}
      <div className={card}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Progresso</p>
        <p className="mt-1 font-display text-2xl font-bold tnum text-slate-900 dark:text-white">
          {prog ? `${prog.pct}%` : '—'}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${prog?.pct ?? 0}%` }} />
        </div>
      </div>

      {/* prazo */}
      <div className={card}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prazo</p>
        {goals?.target_date ? (() => {
          // dias até a data-alvo, calculado direto da data (independe de ter peso/meta)
          const t = new Date(goals.target_date + 'T00:00:00')
          const now = new Date()
          const days = Math.ceil((t - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
          return (
            <>
              <p className="mt-1 font-display text-2xl font-bold tnum text-slate-900 dark:text-white">
                {days >= 0 ? `${days}d` : 'vencido'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                até {formatDateBR(goals.target_date)}
                {prog?.paceNeeded != null && !prog.reached && (
                  <> · {Math.abs(prog.paceNeeded).toFixed(2)} kg/sem</>
                )}
              </p>
            </>
          )
        })() : (
          <p className="mt-1 text-sm text-slate-400">sem data-alvo</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────── DIÁRIO ───────────────────────────
const MEAL_ICONS = { Café: Coffee, Almoço: UtensilsCrossed, Lanche: Cookie, Jantar: Soup, Ceia: Moon }
// Cor por refeição (usada na barra de progresso de cada card de refeição).
const MEAL_ACCENT = {
  Café: 'bg-amber-400',
  Almoço: 'bg-brand-500',
  Lanche: 'bg-violet-400',
  Jantar: 'bg-emerald-500',
  Ceia: 'bg-indigo-400',
}

// Editor da distribuição da meta diária de calorias entre as refeições.
// Guarda percentuais por refeição em nutrition_goals.meal_split; a meta em
// kcal de cada refeição é recalculada a partir da meta diária × percentual.
function MealSplitEditor({ goals, saveGoals }) {
  const initial = goals?.meal_split && Object.keys(goals.meal_split).length ? goals.meal_split : DEFAULT_MEAL_SPLIT
  const [split, setSplit] = useState(initial)
  useEffect(() => {
    setSplit(goals?.meal_split && Object.keys(goals.meal_split).length ? goals.meal_split : DEFAULT_MEAL_SPLIT)
  }, [goals?.meal_split])

  const total = MEALS.reduce((s, m) => s + (Number(split[m]) || 0), 0)
  const daily = Number(goals?.calories || 0)
  const off = total !== 100

  const setPct = (m, v) => setSplit((s) => ({ ...s, [m]: v }))
  const persist = () => {
    const clean = {}
    for (const m of MEALS) clean[m] = Number(split[m]) || 0
    saveGoals({ meal_split: clean })
  }

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-ink-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Metas por refeição (%)</span>
        <span className={`tnum text-xs font-semibold ${off ? 'text-coral' : 'text-emerald-500'}`}>
          soma {total}%
        </span>
      </div>
      {MEALS.map((m) => {
        const pct = Number(split[m]) || 0
        const kcal = Math.round((daily * pct) / 100)
        return (
          <label key={m} className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex-1">{m}</span>
            <span className="tnum w-16 text-right text-xs text-slate-400">{kcal} kcal</span>
            <input
              type="number"
              min="0"
              max="100"
              value={split[m] ?? 0}
              onChange={(e) => setPct(m, e.target.value)}
              onBlur={persist}
              className={`${inputCls} w-16 text-right`}
            />
          </label>
        )
      })}
      {off && (
        <p className="text-[11px] text-coral">
          A soma deveria dar 100% (está {total}%). Ajuste os percentuais para dividir a meta certinho.
        </p>
      )}
    </div>
  )
}

// Card de passos do dia: total manual + meta editável, com barra de progresso
// e indicação de meta batida. Só informativo.
function StepsCard({ health, date }) {
  const [editingGoal, setEditingGoal] = useState(false)
  const steps = health.data?.steps ?? null
  const goal = health.data?.steps_goal ?? 8000
  const hit = steps != null && goal > 0 && steps >= goal
  const pct = steps != null && goal > 0 ? Math.min(100, Math.round((steps / goal) * 100)) : 0

  return (
    <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Footprints size={14} /> Passos
        </div>
        {editingGoal ? (
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            defaultValue={goal}
            onBlur={(e) => {
              const v = e.target.value
              if (String(v) !== String(goal)) health.saveStepsGoal(v)
              setEditingGoal(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-20 rounded border border-emerald-300 bg-white px-1 py-0.5 text-right text-[11px] tabular-nums text-slate-700 outline-none dark:border-emerald-700 dark:bg-ink-900 dark:text-slate-200"
          />
        ) : (
          <button
            onClick={() => setEditingGoal(true)}
            className="text-[11px] text-emerald-700/70 hover:text-emerald-700 dark:text-emerald-300/70 dark:hover:text-emerald-300"
            title="Editar meta de passos"
          >
            meta {goal.toLocaleString('pt-BR')} ✎
          </button>
        )}
      </div>

      <input
        type="number"
        inputMode="numeric"
        defaultValue={steps ?? ''}
        key={`steps-${date}-${steps ?? ''}`}
        onBlur={(e) => {
          const v = e.target.value
          if (String(v) !== String(steps ?? '')) health.saveSteps(v)
        }}
        placeholder="—"
        className="mt-1 w-full bg-transparent text-xl font-bold tabular-nums text-slate-800 outline-none placeholder:text-slate-300 dark:text-slate-100"
      />

      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/60">
        <div
          className={`h-full rounded-full transition-all ${hit ? 'bg-emerald-500' : 'bg-emerald-400/80'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        {steps == null
          ? 'digite o total do dia'
          : hit
            ? '🎉 meta batida!'
            : `faltam ${(goal - steps).toLocaleString('pt-BR')} passos`}
      </div>
    </div>
  )
}

function DiarioTab() {
  const [date, setDate] = useState(todayKey())
  const day = useNutritionDay(date)
  const health = useHealthDay(date)
  const bodyGoals = useBodyGoals()
  const measurements = useMeasurements()
  const dietary = useDietaryProfile()
  const { weekStart } = useWeek()
  const agenda = useAgenda(weekStart)
  const [meal, setMeal] = useState('Almoço')
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState(null)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [goalsAiBusy, setGoalsAiBusy] = useState(false)
  const [goalsNote, setGoalsNote] = useState(null)
  // espelha day.goals num estado local pra refletir tanto edição manual (onBlur)
  // quanto o preenchimento vindo da IA, sem salvar a cada tecla digitada
  const [macroForm, setMacroForm] = useState(day.goals)
  useEffect(() => setMacroForm(day.goals), [day.goals])

  // Gera as metas de calorias/macros pela IA a partir de idade, peso, altura
  // e do OBJETIVO definido em Medidas (peso-alvo/data-alvo — emagrecer, manter
  // ou ganhar peso), cruzando com as atividades físicas da semana na Agenda.
  const genGoalsWithAI = async () => {
    setGoalsAiBusy(true)
    setGoalsNote(null)
    try {
      const age = bodyGoals.goals?.birth_date
        ? Math.floor((Date.now() - new Date(bodyGoals.goals.birth_date + 'T00:00:00').getTime()) / 31557600000)
        : null
      const height_cm = bodyGoals.goals?.height_cm ?? null
      const weight_kg = measurements.stats?.current ?? null
      const missing = []
      if (age == null) missing.push('data de nascimento')
      if (!height_cm) missing.push('altura')
      if (!weight_kg) missing.push('peso (registre uma medição)')
      if (missing.length) {
        setGoalsNote(`Preencha antes em Medidas: ${missing.join(', ')}.`)
        return
      }
      const activityCounts = {}
      for (const a of agenda.items) {
        if (a.category) activityCounts[a.category] = (activityCounts[a.category] ?? 0) + 1
      }
      const activities = Object.entries(activityCounts).map(([category, count]) => ({ category, count }))
      const res = await callNutritionAI('macro_goals', {
        age,
        height_cm,
        weight_kg,
        activities,
        target_weight: bodyGoals.goals?.target_weight ?? null,
        target_date: bodyGoals.goals?.target_date ?? null,
        profile: dietary.profile,
      })
      if (res?.calories) {
        await day.saveGoals({
          calories: Number(res.calories) || day.goals.calories,
          protein_g: Number(res.protein_g) || day.goals.protein_g,
          carbs_g: Number(res.carbs_g) || day.goals.carbs_g,
          fat_g: Number(res.fat_g) || day.goals.fat_g,
          water_ml_goal: Number(res.water_ml) || day.goals.water_ml_goal,
          goal_type: res.goal_type ?? day.goals.goal_type,
          ...(res.meal_split && typeof res.meal_split === 'object' ? { meal_split: res.meal_split } : {}),
        })
      }
      setGoalsNote(res?.note ?? `Metas geradas pela IA (objetivo: ${res?.goal_type ?? day.goals.goal_type}), com base no seu perfil, meta de peso e na semana da Agenda.`)
    } catch (e) {
      setGoalsNote(`Erro: ${e.message}`)
    } finally {
      setGoalsAiBusy(false)
    }
  }

  // Cada item que a IA identificar no texto vira um lançamento separado no
  // diário, na refeição escolhida acima. Em modo mock (IA não configurada),
  // ainda assim lança, só que com macros zerados (edite depois se precisar).
  const parseWithAI = async () => {
    if (!aiText.trim()) return
    setAiBusy(true)
    setAiNote(null)
    try {
      const res = await callNutritionAI('parse_food', { text: aiText, profile: dietary.profile })
      const items = Array.isArray(res?.items) ? res.items : []
      if (items.length) {
        for (const it of items) {
          await day.addLog({
            meal,
            description: it.description ?? aiText,
            calories: Number(it.calories) || 0,
            protein_g: Number(it.protein_g) || 0,
            carbs_g: Number(it.carbs_g) || 0,
            fat_g: Number(it.fat_g) || 0,
          })
        }
        setAiText('')
        const base = `${items.length} ${items.length === 1 ? 'item adicionado' : 'itens adicionados'} em ${meal}.`
        setAiNote(res?.mock ? `${base} IA não configurada: macros ficaram zerados.` : base)
      } else if (res?.note) {
        setAiNote(res.note)
      }
    } catch (e) {
      setAiNote(`Erro na IA: ${e.message}`)
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <GoalSummary />

      {/* entrada (2/3) + progresso do dia (1/3), mesma altura por serem os 2 únicos itens da linha */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <div className="mb-3 flex items-center justify-between">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <span className="text-xs text-slate-400">{formatDateBR(date)}</span>
          </div>

          {/* seletor visual de refeição */}
          <div className="mb-3 flex flex-wrap gap-2">
            {MEALS.map((m) => {
              const Icon = MEAL_ICONS[m] ?? UtensilsCrossed
              return (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    meal === m
                      ? 'bg-brand-500 text-white shadow-card'
                      : 'border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-ink-700 dark:text-slate-400 dark:hover:bg-ink-800'
                  }`}
                >
                  <Icon size={15} /> {m}
                </button>
              )
            })}
          </div>

          {/* entrada por IA */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Sparkles size={13} /> Descreva o que comeu em {meal}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="Ex: 100g de arroz, 60g de legumes, 130g de alcatra no shoyo e 60g de lentilha"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parseWithAI()}
              />
              <button
                onClick={parseWithAI}
                disabled={aiBusy}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {aiBusy ? '…' : 'Adicionar'}
              </button>
            </div>
            {aiNote && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{aiNote}</p>}
          </div>
        </div>

        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">Progresso do dia</h3>
            <button
              onClick={() => setGoalsOpen((o) => !o)}
              aria-expanded={goalsOpen}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                goalsOpen
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-ink-800 dark:text-slate-400'
              }`}
            >
              <Target size={13} /> Metas
              <ChevronDown size={13} className={`transition-transform ${goalsOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <MacroProgress
            totals={day.totals}
            goals={day.goals}
            water={{ total: day.waterTotal, goal: day.goals.water_ml_goal }}
            onAddWater={day.addWater}
            onUndoWater={day.removeLastWater}
          />

          {/* atividade do dia: calorias gastas (das atividades concluídas na
              Agenda) + passos (manual). Só informativo — não mexe na meta de
              ingestão. */}
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-ink-800">
            <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-900/30">
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                <Flame size={14} /> Calorias gastas
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {health.caloriesBurned != null ? health.caloriesBurned : '—'}
                <span className="ml-1 text-xs font-normal text-slate-400">kcal</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                das atividades concluídas
              </div>
            </div>

            <StepsCard health={health} date={date} />
          </div>

          {goalsOpen && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-ink-800">
              <button
                onClick={genGoalsWithAI}
                disabled={goalsAiBusy}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
              >
                <Sparkles size={13} /> {goalsAiBusy ? 'Calculando…' : 'Gerar metas com IA'}
              </button>
              {goalsNote && <p className="text-xs text-slate-500 dark:text-slate-400">{goalsNote}</p>}

              {[
                ['calories', 'Calorias (kcal)'],
                ['protein_g', 'Proteína (g)'],
                ['carbs_g', 'Carboidrato (g)'],
                ['fat_g', 'Gordura (g)'],
                ['water_ml_goal', 'Água (ml)'],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  {label}
                  <input
                    type="number"
                    value={macroForm[k]}
                    onChange={(e) => setMacroForm((f) => ({ ...f, [k]: e.target.value }))}
                    onBlur={(e) => day.saveGoals({ [k]: Number(e.target.value) || 0 })}
                    className={`${inputCls} w-24 text-right`}
                  />
                </label>
              ))}

              {/* distribuição da meta diária entre as refeições (%) */}
              <MealSplitEditor goals={day.goals} saveGoals={day.saveGoals} />

              <label className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                Objetivo
                <select
                  defaultValue={day.goals.goal_type}
                  onChange={(e) => day.saveGoals({ goal_type: e.target.value })}
                  className={`${inputCls} w-32`}
                >
                  <option value="cutting">Cutting</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="bulking">Bulking</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* refeições do dia — cada uma com sua meta de calorias (fatia da meta
          diária) e barra de progresso própria; grade responsiva */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Refeições do dia
          </h3>
          <span className="text-xs text-slate-400">meta de cada refeição = fatia da meta diária</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MEALS.map((m) => {
            const rows = day.byMeal[m] ?? []
            const consumed = Math.round(day.mealTotals[m] ?? 0)
            const target = day.mealGoals[m] ?? 0
            const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0
            const over = target > 0 && consumed > target
            const Icon = MEAL_ICONS[m] ?? UtensilsCrossed
            const active = meal === m
            return (
              <div
                key={m}
                className={`${card} flex flex-col ${active ? 'ring-2 ring-brand-400 dark:ring-brand-500' : ''}`}
              >
                {/* cabeçalho clicável: seleciona a refeição pro campo de IA acima */}
                <button
                  onClick={() => setMeal(m)}
                  title={`Lançar em ${m}`}
                  className="mb-2 flex items-center justify-between text-left"
                >
                  <span className="flex items-center gap-2 font-display font-bold text-slate-800 dark:text-slate-100">
                    <Icon size={16} className="text-slate-400" /> {m}
                  </span>
                  <span className={`tnum text-sm font-semibold ${over ? 'text-coral' : 'text-slate-500 dark:text-slate-400'}`}>
                    {consumed}
                    <span className="text-slate-400"> / {target || '—'} kcal</span>
                  </span>
                </button>

                {/* barra de progresso da refeição */}
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-coral' : MEAL_ACCENT[m] ?? 'bg-brand-500'}`}
                    style={{ width: `${target > 0 ? Math.min(100, (consumed / target) * 100) : 0}%` }}
                  />
                </div>
                {over && (
                  <p className="-mt-2 mb-2 text-[11px] font-medium text-coral">
                    {consumed - target} kcal acima da meta desta refeição
                  </p>
                )}

                {/* entradas da refeição */}
                {rows.length ? (
                  <ul className="flex-1 divide-y divide-slate-100 dark:divide-ink-800/60">
                    {rows.map((l) => (
                      <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{l.description}</span>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <span className="tnum text-xs text-slate-400">
                            {Math.round(Number(l.calories))} kcal
                          </span>
                          <button onClick={() => day.removeLog(l.id)} className="rounded p-1 text-slate-400 hover:text-coral">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <button
                    onClick={() => setMeal(m)}
                    className="flex-1 rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-ink-700 dark:hover:border-brand-700"
                  >
                    Nada lançado — clique e descreva o que comeu acima
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ────────────────── CARDÁPIO & COMPRAS ──────────────────
// As duas ficam na mesma tela porque a lista de compras é gerada a partir
// do cardápio da semana (a IA lê os pratos planejados pra montar os itens).
function CardapioTab() {
  const { weekStart, prevWeek, nextWeek } = useWeek()
  const plan = useMealPlan(weekStart)
  const day = useNutritionDay(todayKey())
  const shop = useShopping()
  const dietary = useDietaryProfile()
  const [shopForm, setShopForm] = useState({ name: '', quantity: '', category: 'Hortifruti' })
  const [planAiBusy, setPlanAiBusy] = useState(false)
  const [planNote, setPlanNote] = useState(null)
  const [shopAiBusy, setShopAiBusy] = useState(false)
  const [shopNote, setShopNote] = useState(null)
  const [addedNote, setAddedNote] = useState(null)

  // Gerar sempre sobrescreve: apaga o cardápio da semana antes de inserir o novo.
  const genPlanWithAI = async () => {
    setPlanAiBusy(true)
    setPlanNote(null)
    try {
      const res = await callNutritionAI('meal_plan', { goals: day.goals, profile: dietary.profile })
      if (res?.plan?.length) {
        await plan.clearAll()
        for (const p of res.plan) await plan.addMeal(p)
      }
      if (res?.note) setPlanNote(res.note)
    } catch (e) {
      setPlanNote(`Erro: ${e.message}`)
    } finally {
      setPlanAiBusy(false)
    }
  }

  const clearPlan = async () => {
    if (!confirm('Excluir todo o cardápio desta semana?')) return
    await plan.clearAll()
  }

  const addQuick = async (weekday) => {
    const description = prompt('Refeição (ex: Almoço - frango com batata doce):')
    if (!description) return
    await plan.addMeal({ weekday, meal: 'Almoço', description, calories: 0 })
  }

  // Copia a sugestão do cardápio pro diário de hoje (ex: comeu o café da manhã planejado).
  const addPlanToDiary = async (m) => {
    await day.addLog({ meal: m.meal, description: m.description, calories: Number(m.calories) || 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    setAddedNote(`"${m.description}" adicionado ao diário de hoje.`)
    setTimeout(() => setAddedNote(null), 2500)
  }

  const addShopItem = async (e) => {
    e.preventDefault()
    if (!shopForm.name.trim()) return
    await shop.addItem({ name: shopForm.name.trim(), quantity: shopForm.quantity.trim() || null, category: shopForm.category })
    setShopForm({ name: '', quantity: '', category: shopForm.category })
  }

  // Gerar sempre sobrescreve: apaga a lista inteira antes de inserir a nova.
  const genShopWithAI = async () => {
    setShopAiBusy(true)
    setShopNote(null)
    try {
      const res = await callNutritionAI('shopping_list', { plan: plan.items, profile: dietary.profile })
      if (res?.items?.length) {
        await shop.clearAll()
        for (const it of res.items) await shop.addItem(it)
      }
      if (res?.note) setShopNote(res.note)
    } catch (e) {
      setShopNote(`Erro: ${e.message}`)
    } finally {
      setShopAiBusy(false)
    }
  }

  const clearShop = async () => {
    if (!confirm('Excluir a lista de compras inteira?')) return
    await shop.clearAll()
  }

  // agrupa a lista de compras por categoria
  const grouped = SHOPPING_CATEGORIES.map((c) => ({ cat: c, items: shop.items.filter((i) => i.category === c) })).filter((g) => g.items.length)

  return (
    <div className="space-y-8">
      {/* ── Cardápio semanal ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-ink-700 dark:bg-ink-800">
            <button onClick={prevWeek} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700"><ChevronLeft size={18} /></button>
            <span className="min-w-[120px] text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{weekLabel(weekStart)}</span>
            <button onClick={nextWeek} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700"><ChevronRight size={18} /></button>
          </div>
          <div className="flex items-center gap-2">
            {plan.items.length > 0 && (
              <button onClick={clearPlan} className="flex items-center gap-1 text-sm text-slate-400 hover:text-coral">
                <Trash2 size={14} /> Limpar cardápio
              </button>
            )}
            <button onClick={genPlanWithAI} disabled={planAiBusy} className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
              <Sparkles size={15} /> {planAiBusy ? 'Gerando…' : 'Gerar cardápio com IA'}
            </button>
          </div>
        </div>
        {planNote && <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-ink-800 dark:text-slate-400">{planNote}</p>}
        {plan.items.length > 0 && <p className="text-xs text-slate-400">Gerar com IA sobrescreve todo o cardápio desta semana.</p>}
        {addedNote && <p className="rounded-xl bg-money/10 px-3 py-2 text-xs font-medium text-money">✓ {addedNote}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={d} className={card}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-slate-400">{d}</p>
                <button onClick={() => addQuick(i)} className="rounded p-1 text-slate-400 hover:text-brand-500"><Plus size={15} /></button>
              </div>
              <div className="space-y-3">
                {MEALS.map((mealName) => {
                  const mealItems = (plan.byDay[i] ?? []).filter((m) => m.meal === mealName)
                  if (!mealItems.length) return null
                  return (
                    <div key={mealName}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">{mealName}</p>
                      <div className="space-y-1.5">
                        {mealItems.map((m) => (
                          <div key={m.id} className="group rounded-lg bg-slate-50 p-2 text-sm dark:bg-ink-800/60">
                            <div className="flex items-start justify-between gap-1">
                              <span className="flex-1 text-slate-700 dark:text-slate-200">{m.description}</span>
                              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                                <button onClick={() => addPlanToDiary(m)} title="Adicionar no diário de hoje" className="rounded p-0.5 text-slate-400 hover:text-money"><Check size={13} /></button>
                                <button onClick={() => plan.removeMeal(m.id)} title="Excluir" className="rounded p-0.5 text-slate-400 hover:text-coral"><Trash2 size={13} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-ink-700" />
        <ShoppingCart size={13} /> Lista de compras da semana
        <span className="h-px flex-1 bg-slate-200 dark:bg-ink-700" />
      </div>

      {/* ── Lista de compras (compacta, derivada do cardápio acima) ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={addShopItem} className="flex flex-1 flex-wrap gap-2">
            <input className={`${inputCls} min-w-[140px] flex-1`} placeholder="Item (ex: Frango)" value={shopForm.name} onChange={(e) => setShopForm((f) => ({ ...f, name: e.target.value }))} />
            <input className={`${inputCls} w-28`} placeholder="Qtd (ex: 1 kg)" value={shopForm.quantity} onChange={(e) => setShopForm((f) => ({ ...f, quantity: e.target.value }))} />
            <select className={`${inputCls} w-36`} value={shopForm.category} onChange={(e) => setShopForm((f) => ({ ...f, category: e.target.value }))}>
              {SHOPPING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={15} />
            </button>
          </form>
          {shop.items.length > 0 && (
            <button onClick={clearShop} className="flex items-center gap-1 text-sm text-slate-400 hover:text-coral">
              <Trash2 size={14} /> Limpar lista
            </button>
          )}
          <button onClick={genShopWithAI} disabled={shopAiBusy} className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <Sparkles size={15} /> {shopAiBusy ? 'Gerando…' : 'Gerar do cardápio'}
          </button>
        </div>
        {shopNote && <p className="text-xs text-slate-400">{shopNote}</p>}
        {shop.items.length > 0 && <p className="text-xs text-slate-400">Gerar do cardápio sobrescreve a lista inteira.</p>}

        {grouped.length === 0 ? (
          <div className={`${card} text-center text-sm text-slate-400`}>Lista vazia. Adicione itens acima.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.map(({ cat, items }) => (
              <div key={cat} className={card}>
                <h3 className="mb-2 font-display text-sm font-bold text-slate-800 dark:text-slate-100">{cat}</h3>
                <ul className="divide-y divide-slate-100 dark:divide-ink-800/60">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                      <button
                        onClick={() => shop.toggleBought(i.id, !i.bought)}
                        className={`inline-grid h-5 w-5 shrink-0 place-items-center rounded border transition ${i.bought ? 'border-money bg-money text-white' : 'border-slate-300 text-transparent hover:border-money dark:border-ink-700'}`}
                      >
                        <Check size={12} />
                      </button>
                      <span className={`flex-1 ${i.bought ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                        {i.name} {i.quantity && <span className="text-slate-400">· {i.quantity}</span>}
                      </span>
                      <button onClick={() => shop.removeItem(i.id)} className="rounded p-1 text-slate-400 hover:text-coral"><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {shop.items.some((i) => i.bought) && (
          <button onClick={shop.clearBought} className="text-sm text-slate-400 hover:text-coral">Limpar comprados</button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────── MEDIDAS ───────────────────────────
function MedidasTab() {
  const m = useMeasurements()
  const bg = useBodyGoals()
  const [goalForm, setGoalForm] = useState(null)
  const [goalSaved, setGoalSaved] = useState(false)

  // sincroniza o formulário quando as metas carregam
  useEffect(() => {
    if (bg.goals !== undefined) {
      setGoalForm({
        birth_date: bg.goals?.birth_date ?? '',
        height_cm: bg.goals?.height_cm ?? '',
        target_weight: bg.goals?.target_weight ?? '',
        target_fat_pct: bg.goals?.target_fat_pct ?? '',
        target_waist: bg.goals?.target_waist ?? '',
        target_date: bg.goals?.target_date ?? '',
      })
    }
  }, [bg.goals])

  const saveGoals = async (e) => {
    e.preventDefault()
    const num = (v) => (v === '' || v == null ? null : Number(v))
    await bg.saveGoals({
      birth_date: goalForm.birth_date || null,
      height_cm: num(goalForm.height_cm),
      target_weight: num(goalForm.target_weight),
      target_fat_pct: num(goalForm.target_fat_pct),
      target_waist: num(goalForm.target_waist),
      target_date: goalForm.target_date || null,
    })
    setGoalSaved(true)
    setTimeout(() => setGoalSaved(false), 2500)
  }

  // idade (a partir da data de nascimento) e IMC (peso atual / altura²)
  const age = bg.goals?.birth_date
    ? Math.floor((Date.now() - new Date(bg.goals.birth_date + 'T00:00:00').getTime()) / 31557600000)
    : null
  const bmi =
    bg.goals?.height_cm && m.stats.current != null
      ? Number(m.stats.current) / (Number(bg.goals.height_cm) / 100) ** 2
      : null
  const bmiLabel = (v) => {
    if (v == null) return null
    if (v < 18.5) return 'abaixo do peso'
    if (v < 25) return 'peso normal'
    if (v < 30) return 'sobrepeso'
    return 'obesidade'
  }

  const [form, setForm] = useState({ measured_at: todayKey(), weight_kg: '', body_fat_pct: '', waist_cm: '', hip_cm: '', chest_cm: '', arm_cm: '', thigh_cm: '' })

  const add = async (e) => {
    e.preventDefault()
    const num = (v) => (v === '' ? null : Number(v))
    await m.addMeasurement({
      measured_at: form.measured_at,
      weight_kg: num(form.weight_kg),
      body_fat_pct: num(form.body_fat_pct),
      waist_cm: num(form.waist_cm),
      hip_cm: num(form.hip_cm),
      chest_cm: num(form.chest_cm),
      arm_cm: num(form.arm_cm),
      thigh_cm: num(form.thigh_cm),
    })
    setForm({ ...form, weight_kg: '', body_fat_pct: '', waist_cm: '', hip_cm: '', chest_cm: '', arm_cm: '', thigh_cm: '' })
  }

  const kpi = (label, value, hint) => (
    <div className={card}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold tnum text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )

  const s = m.stats
  const fmtDelta = (d) => (d == null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(1)} kg`)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpi('Peso atual', s.current != null ? `${s.current} kg` : '—')}
        {kpi('Desde o início', fmtDelta(s.delta), s.first != null ? `de ${s.first} kg` : null)}
        {kpi('Última variação', fmtDelta(s.lastDelta))}
        {kpi('% Gordura', s.bodyFat != null ? `${s.bodyFat}%` : '—')}
        {kpi('Idade', age != null ? `${age} anos` : '—')}
        {kpi('IMC', bmi != null ? bmi.toFixed(1) : '—', bmiLabel(bmi))}
      </div>

      {/* nova medição — logo após os KPIs, é a ação mais usada desta aba */}
      <form onSubmit={add} className={`${card} border-2 border-brand-200 dark:border-brand-800`}>
        <h3 className="mb-3 font-display font-bold text-slate-800 dark:text-slate-100">Registrar medição</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs text-slate-500 dark:text-slate-400">Data
            <input type="date" value={form.measured_at} onChange={(e) => setForm((f) => ({ ...f, measured_at: e.target.value }))} className={`${inputCls} mt-1 w-full`} />
          </label>
          {[
            ['weight_kg', 'Peso (kg)'],
            ['body_fat_pct', '% Gordura'],
            ['waist_cm', 'Cintura (cm)'],
            ['hip_cm', 'Quadril (cm)'],
            ['chest_cm', 'Peito (cm)'],
            ['arm_cm', 'Braço (cm)'],
            ['thigh_cm', 'Coxa (cm)'],
          ].map(([k, label]) => (
            <label key={k} className="text-xs text-slate-500 dark:text-slate-400">{label}
              <input type="number" step="0.1" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={`${inputCls} mt-1 w-full`} />
            </label>
          ))}
        </div>
        <button type="submit" className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Salvar medição</button>
      </form>

      {/* perfil + metas corporais */}
      <form onSubmit={saveGoals} className={card}>
        <h3 className="mb-3 font-display font-bold text-slate-800 dark:text-slate-100">Perfil e metas corporais</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['birth_date', 'Data de nascimento', 'date'],
            ['height_cm', 'Altura (cm)', 'number'],
            ['target_weight', 'Peso alvo (kg)', 'number'],
            ['target_fat_pct', '% Gordura alvo', 'number'],
            ['target_waist', 'Cintura alvo (cm)', 'number'],
            ['target_date', 'Data-alvo', 'date'],
          ].map(([k, label, type]) => (
            <label key={k} className="text-xs text-slate-500 dark:text-slate-400">
              {label}
              <input
                type={type}
                step={type === 'number' ? '0.1' : undefined}
                value={goalForm?.[k] ?? ''}
                onChange={(e) => setGoalForm((f) => ({ ...f, [k]: e.target.value }))}
                className={`${inputCls} mt-1 w-full`}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Salvar metas
          </button>
          {goalSaved && <span className="text-sm text-money">✓ metas salvas</span>}
          <span className="ml-auto text-xs text-slate-400">Idade e altura alimentam o "Gerar metas com IA" no Diário.</span>
        </div>
      </form>

      {/* gráfico */}
      <div className={card}>
        <h3 className="mb-4 font-display font-bold text-slate-800 dark:text-slate-100">Evolução do peso</h3>
        <WeightChart data={m.items} />
      </div>

      {/* histórico */}
      {m.items.length > 0 && (
        <div className={card}>
          <h3 className="mb-3 font-display font-bold text-slate-800 dark:text-slate-100">Histórico</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-ink-800">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3 text-right">Peso</th>
                  <th className="py-2 pr-3 text-right">% Gord</th>
                  <th className="py-2 pr-3 text-right">Cintura</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {[...m.items].reverse().map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-ink-800/60">
                    <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{formatDateBR(row.measured_at)}</td>
                    <td className="py-2 pr-3 text-right tnum">{row.weight_kg != null ? `${row.weight_kg} kg` : '—'}</td>
                    <td className="py-2 pr-3 text-right tnum">{row.body_fat_pct != null ? `${row.body_fat_pct}%` : '—'}</td>
                    <td className="py-2 pr-3 text-right tnum">{row.waist_cm != null ? `${row.waist_cm} cm` : '—'}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => m.removeMeasurement(row.id)} className="rounded p-1 text-slate-400 hover:text-coral"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────── PREFERÊNCIAS ───────────────────────────
// A aba de Preferências agora é o onboarding da anamnese (wizard com
// modos básico/completo, salvar-e-continuar e retomada). Toda a lógica
// vive em AnamneseOnboarding — aqui é só o ponto de montagem.
function PreferenciasTab() {
  return <AnamneseOnboarding />
}
