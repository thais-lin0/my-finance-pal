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
  Target,
} from 'lucide-react'
import { useWeek } from '../context/WeekContext'
import {
  useNutritionDay,
  useMealPlan,
  useShopping,
  useMeasurements,
  useBodyGoals,
  computeWeightProgress,
  MEALS,
  SHOPPING_CATEGORIES,
} from '../hooks/useNutrition'
import { callNutritionAI } from '../lib/nutritionAI'
import { todayKey, addDays, formatDateBR, weekLabel, WEEKDAYS_SHORT } from '../lib/format'
import MacroProgress from '../components/MacroProgress'
import WeightChart from '../components/WeightChart'
import Sparkline from '../components/Sparkline'

const TABS = [
  { id: 'diario', label: 'Diário', icon: UtensilsCrossed },
  { id: 'cardapio', label: 'Cardápio', icon: CalendarRange },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'medidas', label: 'Medidas', icon: Ruler },
]

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900'

export default function NutricaoPage() {
  const [tab, setTab] = useState('diario')

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 lg:px-8">
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
          </button>
        ))}
      </div>

      {tab === 'diario' && <DiarioTab />}
      {tab === 'cardapio' && <CardapioTab />}
      {tab === 'compras' && <ComprasTab />}
      {tab === 'medidas' && <MedidasTab />}
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
function DiarioTab() {
  const [date, setDate] = useState(todayKey())
  const day = useNutritionDay(date)
  const [form, setForm] = useState({ meal: 'Almoço', description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState(null)
  const [goalsOpen, setGoalsOpen] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return
    await day.addLog({
      meal: form.meal,
      description: form.description.trim(),
      calories: Number(form.calories) || 0,
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
    })
    setForm({ meal: form.meal, description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  }

  // Parsing por IA: preenche o formulário a partir do texto livre
  const parseWithAI = async () => {
    if (!aiText.trim()) return
    setAiBusy(true)
    setAiNote(null)
    try {
      const res = await callNutritionAI('parse_food', { text: aiText })
      const it = res?.items?.[0]
      if (it) {
        setForm((f) => ({
          ...f,
          description: it.description ?? aiText,
          calories: String(it.calories ?? ''),
          protein_g: String(it.protein_g ?? ''),
          carbs_g: String(it.carbs_g ?? ''),
          fat_g: String(it.fat_g ?? ''),
        }))
      }
      if (res?.note) setAiNote(res.note)
    } catch (e) {
      setAiNote(`Erro na IA: ${e.message}`)
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <GoalSummary />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* coluna principal: refeições */}
      <div className="space-y-4 lg:col-span-2">
        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <span className="text-xs text-slate-400">{formatDateBR(date)}</span>
          </div>

          {/* entrada por IA */}
          <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Sparkles size={13} /> Descreva o que comeu (IA estima os macros)
            </label>
            <div className="mt-2 flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="Ex: 150g de frango, arroz e salada"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <button
                onClick={parseWithAI}
                disabled={aiBusy}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {aiBusy ? '…' : 'Analisar'}
              </button>
            </div>
            {aiNote && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{aiNote}</p>}
          </div>

          {/* form manual */}
          <form onSubmit={add} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <select value={form.meal} onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value }))} className={`${inputCls} col-span-2`}>
              {MEALS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input className={`${inputCls} col-span-4`} placeholder="Descrição" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <input className={inputCls} type="number" step="0.1" placeholder="kcal" value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} />
            <input className={inputCls} type="number" step="0.1" placeholder="Prot" value={form.protein_g} onChange={(e) => setForm((f) => ({ ...f, protein_g: e.target.value }))} />
            <input className={inputCls} type="number" step="0.1" placeholder="Carb" value={form.carbs_g} onChange={(e) => setForm((f) => ({ ...f, carbs_g: e.target.value }))} />
            <input className={inputCls} type="number" step="0.1" placeholder="Gord" value={form.fat_g} onChange={(e) => setForm((f) => ({ ...f, fat_g: e.target.value }))} />
            <button type="submit" className="col-span-2 flex items-center justify-center gap-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={15} /> Adicionar
            </button>
          </form>
        </div>

        {/* refeições por tipo */}
        {MEALS.map((m) => {
          const rows = day.byMeal[m] ?? []
          if (!rows.length) return null
          return (
            <div key={m} className={card}>
              <h3 className="mb-2 font-display font-bold text-slate-800 dark:text-slate-100">{m}</h3>
              <ul className="divide-y divide-slate-100 dark:divide-ink-800/60">
                {rows.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{l.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="tnum text-slate-400">
                        {Math.round(Number(l.calories))} kcal · P{Math.round(Number(l.protein_g))} C{Math.round(Number(l.carbs_g))} G{Math.round(Number(l.fat_g))}
                      </span>
                      <button onClick={() => day.removeLog(l.id)} className="rounded p-1 text-slate-400 hover:text-coral">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* coluna lateral: metas + progresso */}
      <div className="space-y-4">
        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">Progresso do dia</h3>
            <button onClick={() => setGoalsOpen((o) => !o)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:bg-ink-800 dark:text-slate-400">
              <Target size={13} /> Metas
            </button>
          </div>
          <MacroProgress totals={day.totals} goals={day.goals} />

          {goalsOpen && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-ink-800">
              {[
                ['calories', 'Calorias (kcal)'],
                ['protein_g', 'Proteína (g)'],
                ['carbs_g', 'Carboidrato (g)'],
                ['fat_g', 'Gordura (g)'],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  {label}
                  <input
                    type="number"
                    defaultValue={day.goals[k]}
                    onBlur={(e) => day.saveGoals({ [k]: Number(e.target.value) || 0 })}
                    className={`${inputCls} w-24 text-right`}
                  />
                </label>
              ))}
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
      </div>
    </div>
  )
}

// ─────────────────────────── CARDÁPIO ───────────────────────────
function CardapioTab() {
  const { weekStart, prevWeek, nextWeek } = useWeek()
  const plan = useMealPlan(weekStart)
  const [aiBusy, setAiBusy] = useState(false)
  const [note, setNote] = useState(null)

  const genWithAI = async () => {
    setAiBusy(true)
    setNote(null)
    try {
      const res = await callNutritionAI('meal_plan', {})
      if (res?.plan?.length) {
        for (const p of res.plan) await plan.addMeal(p)
      }
      if (res?.note) setNote(res.note)
    } catch (e) {
      setNote(`Erro: ${e.message}`)
    } finally {
      setAiBusy(false)
    }
  }

  const addQuick = async (weekday) => {
    const description = prompt('Refeição (ex: Almoço - frango com batata doce):')
    if (!description) return
    await plan.addMeal({ weekday, meal: 'Almoço', description, calories: 0 })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-ink-700 dark:bg-ink-800">
          <button onClick={prevWeek} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700"><ChevronLeft size={18} /></button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{weekLabel(weekStart)}</span>
          <button onClick={nextWeek} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700"><ChevronRight size={18} /></button>
        </div>
        <button onClick={genWithAI} disabled={aiBusy} className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
          <Sparkles size={15} /> Gerar com IA
        </button>
      </div>
      {note && <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-ink-800 dark:text-slate-400">{note}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} className={card}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-400">{d}</p>
              <button onClick={() => addQuick(i)} className="rounded p-1 text-slate-400 hover:text-brand-500"><Plus size={15} /></button>
            </div>
            <div className="space-y-2">
              {(plan.byDay[i] ?? []).map((m) => (
                <div key={m.id} className="group rounded-lg bg-slate-50 p-2 text-sm dark:bg-ink-800/60">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-slate-700 dark:text-slate-200">{m.description}</span>
                    <button onClick={() => plan.removeMeal(m.id)} className="opacity-0 transition group-hover:opacity-100 text-slate-400 hover:text-coral"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────── COMPRAS ───────────────────────────
function ComprasTab() {
  const shop = useShopping()
  const [form, setForm] = useState({ name: '', quantity: '', category: 'Hortifruti' })
  const [aiBusy, setAiBusy] = useState(false)
  const [note, setNote] = useState(null)

  const add = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await shop.addItem({ name: form.name.trim(), quantity: form.quantity.trim() || null, category: form.category })
    setForm({ name: '', quantity: '', category: form.category })
  }

  const genWithAI = async () => {
    setAiBusy(true)
    setNote(null)
    try {
      const res = await callNutritionAI('shopping_list', {})
      if (res?.items?.length) for (const it of res.items) await shop.addItem(it)
      if (res?.note) setNote(res.note)
    } catch (e) {
      setNote(`Erro: ${e.message}`)
    } finally {
      setAiBusy(false)
    }
  }

  // agrupa por categoria
  const grouped = SHOPPING_CATEGORIES.map((c) => ({ cat: c, items: shop.items.filter((i) => i.category === c) })).filter((g) => g.items.length)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {grouped.length === 0 && <div className={`${card} text-center text-sm text-slate-400`}>Lista vazia. Adicione itens ao lado.</div>}
        {grouped.map(({ cat, items }) => (
          <div key={cat} className={card}>
            <h3 className="mb-2 font-display font-bold text-slate-800 dark:text-slate-100">{cat}</h3>
            <ul className="divide-y divide-slate-100 dark:divide-ink-800/60">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                  <button
                    onClick={() => shop.toggleBought(i.id, !i.bought)}
                    className={`inline-grid h-5 w-5 place-items-center rounded border transition ${i.bought ? 'border-money bg-money text-white' : 'border-slate-300 text-transparent hover:border-money dark:border-ink-700'}`}
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
        {shop.items.some((i) => i.bought) && (
          <button onClick={shop.clearBought} className="text-sm text-slate-400 hover:text-coral">Limpar comprados</button>
        )}
      </div>

      <div className="space-y-4">
        <form onSubmit={add} className={`${card} space-y-2`}>
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">Adicionar item</h3>
          <input className={`${inputCls} w-full`} placeholder="Item (ex: Frango)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={`${inputCls} w-full`} placeholder="Quantidade (ex: 1 kg)" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <select className={`${inputCls} w-full`} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {SHOPPING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button type="submit" className="w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600">Adicionar</button>
        </form>
        <button onClick={genWithAI} disabled={aiBusy} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
          <Sparkles size={15} /> Gerar do cardápio (IA)
        </button>
        {note && <p className="text-xs text-slate-400">{note}</p>}
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
      target_weight: num(goalForm.target_weight),
      target_fat_pct: num(goalForm.target_fat_pct),
      target_waist: num(goalForm.target_waist),
      target_date: goalForm.target_date || null,
    })
    setGoalSaved(true)
    setTimeout(() => setGoalSaved(false), 2500)
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpi('Peso atual', s.current != null ? `${s.current} kg` : '—')}
        {kpi('Desde o início', fmtDelta(s.delta), s.first != null ? `de ${s.first} kg` : null)}
        {kpi('Última variação', fmtDelta(s.lastDelta))}
        {kpi('% Gordura', s.bodyFat != null ? `${s.bodyFat}%` : '—')}
      </div>

      {/* metas corporais */}
      <form onSubmit={saveGoals} className={card}>
        <h3 className="mb-3 font-display font-bold text-slate-800 dark:text-slate-100">Metas corporais</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
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
          <span className="ml-auto text-xs text-slate-400">Alimentam os cards de progresso no Diário.</span>
        </div>
      </form>

      {/* gráfico */}
      <div className={card}>
        <h3 className="mb-4 font-display font-bold text-slate-800 dark:text-slate-100">Evolução do peso</h3>
        <WeightChart data={m.items} />
      </div>

      {/* nova medição */}
      <form onSubmit={add} className={card}>
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
