import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthKey } from '../lib/format'

export const INVESTMENT_KINDS = ['CDB', 'Tesouro', 'Ações', 'FII', 'Fundo', 'Poupança', 'Cripto', 'Outros']

// Portfólio de investimentos — acumulado ao longo do tempo (não por mês).
export function useInvestments() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('invested_at', { ascending: false })
    if (error) setError(error.message)
    setItems(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const addInvestment = async (payload) => {
    const { error } = await supabase
      .from('investments')
      .insert({ ...payload, user_id: user.id, source: payload.source ?? 'manual' })
    if (error) throw error
    await load()
  }

  const updateInvestment = async (id, patch) => {
    const { error } = await supabase.from('investments').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }

  const removeInvestment = async (id) => {
    const { error } = await supabase.from('investments').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  const total = useMemo(() => items.reduce((s, i) => s + Number(i.amount), 0), [items])

  // alocação por tipo (barras)
  const byKind = useMemo(() => {
    const m = new Map()
    for (const i of items) m.set(i.kind, (m.get(i.kind) ?? 0) + Number(i.amount))
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [items])

  // evolução do patrimônio acumulado por mês do aporte (linha)
  const growth = useMemo(() => {
    const m = new Map()
    for (const i of items) {
      const key = monthKey(new Date(i.invested_at + 'T00:00:00'))
      m.set(key, (m.get(key) ?? 0) + Number(i.amount))
    }
    const months = [...m.keys()].sort()
    let acc = 0
    return months.map((mo) => {
      acc += m.get(mo)
      return { month: mo, aporte: m.get(mo), acumulado: acc }
    })
  }, [items])

  return { items, loading, error, total, byKind, growth, reload: load, addInvestment, updateInvestment, removeInvestment }
}
