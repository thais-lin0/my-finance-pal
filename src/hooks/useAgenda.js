import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { addDays } from '../lib/format'

// Atividades da semana selecionada (week_start = segunda-feira).
export function useAgenda(weekStart) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user || !weekStart) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('week_start', weekStart)
      .order('weekday')
      .order('start_time', { nullsFirst: true })
    if (error) setError(error.message)
    setItems(data ?? [])
    setLoading(false)
  }, [user, weekStart])

  useEffect(() => {
    load()
  }, [load])

  const addActivity = async (payload) => {
    const { error } = await supabase
      .from('activities')
      .insert({ ...payload, user_id: user.id, week_start: weekStart })
    if (error) throw error
    await load()
  }

  const updateActivity = async (id, patch) => {
    const { error } = await supabase.from('activities').update(patch).eq('id', id)
    if (error) throw error
    // atualização otimista para o toggle de status ficar instantâneo
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const removeActivity = async (id) => {
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  // Copia as atividades fixas (is_recurring) da semana anterior para esta,
  // sem duplicar (compara por título + dia da semana). Retorna quantas criou.
  const bringRecurring = async () => {
    if (!user || !weekStart) return 0
    const prev = addDays(weekStart, -7)
    const { data, error } = await supabase
      .from('activities')
      .select('title, category, weekday, start_time, end_time, notes, is_recurring')
      .eq('week_start', prev)
      .eq('is_recurring', true)
    if (error) throw error

    const existing = new Set(items.map((a) => `${a.weekday}|${a.title.trim().toLowerCase()}`))
    const toAdd = (data ?? [])
      .filter((a) => !existing.has(`${a.weekday}|${a.title.trim().toLowerCase()}`))
      .map((a) => ({
        user_id: user.id,
        week_start: weekStart,
        weekday: a.weekday,
        title: a.title,
        category: a.category,
        start_time: a.start_time,
        end_time: a.end_time,
        notes: a.notes,
        is_recurring: true,
        status: 'pendente',
      }))

    if (toAdd.length) {
      const { error: insErr } = await supabase.from('activities').insert(toAdd)
      if (insErr) throw insErr
    }
    await load()
    return toAdd.length
  }

  // agrupa por dia da semana (0..6)
  const byDay = useMemo(() => {
    const map = Array.from({ length: 7 }, () => [])
    for (const a of items) map[a.weekday]?.push(a)
    return map
  }, [items])

  const stats = useMemo(() => {
    const total = items.length
    const done = items.filter((a) => a.status === 'feito').length
    const missed = items.filter((a) => a.status === 'nao_realizado').length
    const pending = total - done - missed
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, missed, pending, pct }
  }, [items])

  return { items, byDay, stats, loading, error, reload: load, addActivity, updateActivity, removeActivity, bringRecurring }
}
