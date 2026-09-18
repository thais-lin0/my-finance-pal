import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { mondayOf } from '../lib/format'

export const MEALS = ['Café', 'Almoço', 'Lanche', 'Jantar', 'Ceia']
export const SHOPPING_CATEGORIES = ['Hortifruti', 'Proteínas', 'Laticínios', 'Grãos', 'Bebidas', 'Padaria', 'Congelados', 'Limpeza', 'Outros']

const DEFAULT_GOALS = { calories: 2000, protein_g: 120, carbs_g: 200, fat_g: 60, goal_type: 'manutencao', water_ml_goal: 2000 }

// Diário + metas de um dia específico (logDate = YYYY-MM-DD).
export function useNutritionDay(logDate) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [water, setWater] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user || !logDate) return
    setLoading(true)
    setError(null)
    const [logRes, goalRes, waterRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('log_date', logDate).order('created_at'),
      supabase.from('nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('water_logs').select('*').eq('log_date', logDate).order('created_at'),
    ])
    if (logRes.error) setError(logRes.error.message)
    setLogs(logRes.data ?? [])
    if (goalRes.data) setGoals(goalRes.data)
    setWater(waterRes.data ?? [])
    setLoading(false)
  }, [user, logDate])

  useEffect(() => {
    load()
  }, [load])

  const addLog = async (payload) => {
    const { error } = await supabase
      .from('food_logs')
      .insert({ ...payload, user_id: user.id, log_date: logDate })
    if (error) throw error
    await load()
  }
  const updateLog = async (id, patch) => {
    const { error } = await supabase.from('food_logs').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }
  const removeLog = async (id) => {
    const { error } = await supabase.from('food_logs').delete().eq('id', id)
    if (error) throw error
    await load()
  }
  const saveGoals = async (patch) => {
    const next = { ...goals, ...patch, user_id: user.id, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('nutrition_goals').upsert(next)
    if (error) throw error
    setGoals(next)
  }
  const addWater = async (amount_ml) => {
    const { error } = await supabase.from('water_logs').insert({ user_id: user.id, log_date: logDate, amount_ml })
    if (error) throw error
    await load()
  }
  const removeLastWater = async () => {
    const last = water[water.length - 1]
    if (!last) return
    const { error } = await supabase.from('water_logs').delete().eq('id', last.id)
    if (error) throw error
    await load()
  }

  const totals = useMemo(() => {
    const sum = (k) => logs.reduce((s, l) => s + Number(l[k] || 0), 0)
    return {
      calories: sum('calories'),
      protein_g: sum('protein_g'),
      carbs_g: sum('carbs_g'),
      fat_g: sum('fat_g'),
    }
  }, [logs])

  const waterTotal = useMemo(() => water.reduce((s, w) => s + Number(w.amount_ml || 0), 0), [water])

  const byMeal = useMemo(() => {
    const map = {}
    for (const m of MEALS) map[m] = []
    for (const l of logs) (map[l.meal] ??= []).push(l)
    return map
  }, [logs])

  return {
    logs,
    byMeal,
    goals,
    totals,
    water,
    waterTotal,
    loading,
    error,
    reload: load,
    addLog,
    updateLog,
    removeLog,
    saveGoals,
    addWater,
    removeLastWater,
  }
}

// Cardápio semanal (weekStart = segunda).
export function useMealPlan(weekStart) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !weekStart) return
    setLoading(true)
    const { data } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('week_start', weekStart)
      .order('weekday')
    setItems(data ?? [])
    setLoading(false)
  }, [user, weekStart])

  useEffect(() => {
    load()
  }, [load])

  const addMeal = async (payload) => {
    const { error } = await supabase.from('meal_plans').insert({ ...payload, user_id: user.id, week_start: weekStart })
    if (error) throw error
    await load()
  }
  const updateMeal = async (id, patch) => {
    const { error } = await supabase.from('meal_plans').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }
  const removeMeal = async (id) => {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id)
    if (error) throw error
    await load()
  }
  // Apaga todo o cardápio da semana atual (usado antes de gerar de novo, pra sobrescrever).
  const clearAll = async () => {
    const { error } = await supabase.from('meal_plans').delete().eq('week_start', weekStart)
    if (error) throw error
    await load()
  }

  const byDay = useMemo(() => {
    const map = Array.from({ length: 7 }, () => [])
    for (const m of items) map[m.weekday]?.push(m)
    return map
  }, [items])

  return { items, byDay, loading, reload: load, addMeal, updateMeal, removeMeal, clearAll }
}

// Lista de compras.
export function useShopping() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('shopping_items').select('*').order('created_at')
    setItems(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const addItem = async (payload) => {
    const { error } = await supabase.from('shopping_items').insert({ ...payload, user_id: user.id })
    if (error) throw error
    await load()
  }
  const toggleBought = async (id, bought) => {
    const { error } = await supabase.from('shopping_items').update({ bought }).eq('id', id)
    if (error) throw error
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, bought } : i)))
  }
  const removeItem = async (id) => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id)
    if (error) throw error
    await load()
  }
  const clearBought = async () => {
    const ids = items.filter((i) => i.bought).map((i) => i.id)
    if (!ids.length) return
    const { error } = await supabase.from('shopping_items').delete().in('id', ids)
    if (error) throw error
    await load()
  }
  // Apaga a lista inteira (usado antes de gerar de novo, pra sobrescrever).
  const clearAll = async () => {
    const ids = items.map((i) => i.id)
    if (!ids.length) return
    const { error } = await supabase.from('shopping_items').delete().in('id', ids)
    if (error) throw error
    await load()
  }

  return { items, loading, reload: load, addItem, toggleBought, removeItem, clearBought, clearAll }
}

// Medidas corporais ao longo do tempo.
export function useMeasurements() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .order('measured_at', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const addMeasurement = async (payload) => {
    const { error } = await supabase.from('body_measurements').insert({ ...payload, user_id: user.id })
    if (error) throw error
    await load()
  }
  const updateMeasurement = async (id, patch) => {
    const { error } = await supabase.from('body_measurements').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }
  const removeMeasurement = async (id) => {
    const { error } = await supabase.from('body_measurements').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  // KPIs: peso atual, variação total e no último registro
  const stats = useMemo(() => {
    const withWeight = items.filter((m) => m.weight_kg != null)
    if (!withWeight.length) return { current: null, first: null, delta: null, lastDelta: null, bodyFat: null }
    const first = withWeight[0]
    const current = withWeight[withWeight.length - 1]
    const prev = withWeight.length > 1 ? withWeight[withWeight.length - 2] : null
    return {
      current: Number(current.weight_kg),
      first: Number(first.weight_kg),
      delta: Number(current.weight_kg) - Number(first.weight_kg),
      lastDelta: prev ? Number(current.weight_kg) - Number(prev.weight_kg) : null,
      bodyFat: current.body_fat_pct != null ? Number(current.body_fat_pct) : null,
    }
  }, [items])

  return { items, stats, loading, reload: load, addMeasurement, updateMeasurement, removeMeasurement }
}

// Metas corporais (peso/gordura/cintura + data-alvo). Uma linha por usuário.
export function useBodyGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('body_goals').select('*').eq('user_id', user.id).maybeSingle()
    setGoals(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const saveGoals = async (patch) => {
    const next = { ...(goals ?? {}), ...patch, user_id: user.id, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('body_goals').upsert(next)
    if (error) throw error
    setGoals(next)
  }

  return { goals, loading, reload: load, saveGoals }
}

// Perfil alimentar (anamnese): restrições, gostos e preferências que
// personalizam o prompt dos recursos de IA. Uma linha por usuário.
export function useDietaryProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('dietary_profile').select('*').eq('user_id', user.id).maybeSingle()
    setProfile(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const saveProfile = async (patch) => {
    const next = { ...(profile ?? {}), ...patch, user_id: user.id, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('dietary_profile').upsert(next)
    if (error) throw error
    setProfile(next)
  }

  return { profile, loading, reload: load, saveProfile }
}

// Dados de saúde de um dia (entrada MANUAL -> health_daily).
// Passos e meta de passos são preenchidos à mão. As calorias gastas vêm
// da soma das atividades concluídas na Agenda naquela data. Nada disso
// altera a meta de ingestão calórica — é só informativo.
export function useHealthDay(logDate) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [caloriesBurned, setCaloriesBurned] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !logDate) return
    setLoading(true)
    // atividades usam week_start (segunda) + weekday (0=Seg..6=Dom), não uma
    // coluna de data — derivo os dois a partir de logDate para casar o dia.
    const ws = mondayOf(new Date(logDate + 'T00:00:00'))
    const wd = (new Date(logDate + 'T00:00:00').getDay() + 6) % 7
    const [{ data: row }, { data: acts }] = await Promise.all([
      supabase
        .from('health_daily')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', logDate)
        .maybeSingle(),
      // soma das calorias gastas nas atividades concluídas nesse dia
      supabase
        .from('activities')
        .select('calories_burned')
        .eq('user_id', user.id)
        .eq('week_start', ws)
        .eq('weekday', wd)
        .eq('status', 'feito')
        .not('calories_burned', 'is', null),
    ])
    setData(row ?? null)
    const burned = (acts ?? []).reduce((sum, a) => sum + Number(a.calories_burned || 0), 0)
    setCaloriesBurned(acts && acts.length ? burned : null)
    setLoading(false)
  }, [user, logDate])

  useEffect(() => {
    load()
  }, [load])

  // Salva passos e/ou meta de passos do dia (upsert).
  const save = async (patch) => {
    const row = {
      user_id: user.id,
      log_date: logDate,
      steps_goal: data?.steps_goal ?? 8000,
      ...(data?.steps != null ? { steps: data.steps } : {}),
      ...patch,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('health_daily')
      .upsert(row, { onConflict: 'user_id,log_date' })
    if (error) throw error
    await load()
  }

  return {
    data,
    caloriesBurned,
    loading,
    reload: load,
    saveSteps: (steps) => save({ steps: steps === '' || steps == null ? null : Number(steps) }),
    saveStepsGoal: (steps_goal) => save({ steps_goal: Number(steps_goal) || 0 }),
  }
}

// Progresso rumo à meta de peso, dado o histórico de medidas e as metas.
// Retorna null se faltar dado. current e start em kg, target em kg.
export function computeWeightProgress(measurements, goals) {
  if (!goals?.target_weight) return null
  const withWeight = (measurements ?? []).filter((m) => m.weight_kg != null)
  if (!withWeight.length) return null
  const start = Number(withWeight[0].weight_kg)
  const current = Number(withWeight[withWeight.length - 1].weight_kg)
  const target = Number(goals.target_weight)

  const totalChange = target - start // negativo = precisa perder
  const doneChange = current - start
  // % do caminho percorrido (0..100), robusto pra ganho ou perda
  let pct = 0
  if (Math.abs(totalChange) > 0.001) pct = Math.max(0, Math.min(100, Math.round((doneChange / totalChange) * 100)))
  else pct = 100
  const remaining = target - current // o que ainda falta variar (com sinal)

  let daysLeft = null
  let paceNeeded = null // kg/semana necessário pra bater a meta
  if (goals.target_date) {
    const today = new Date()
    const t = new Date(goals.target_date + 'T00:00:00')
    daysLeft = Math.ceil((t - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
    if (daysLeft > 0) paceNeeded = (remaining / daysLeft) * 7
  }
  const reached = Math.abs(remaining) < 0.05 || (totalChange < 0 ? current <= target : current >= target)

  return { start, current, target, pct, remaining, daysLeft, paceNeeded, reached }
}
