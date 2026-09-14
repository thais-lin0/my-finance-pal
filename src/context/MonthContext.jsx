import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { monthKey, monthsFromStart, nextMonthKey } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const { user } = useAuth()
  // meses que existem no banco (ref_month distintos de despesas/receitas/poupança)
  const [dbMonths, setDbMonths] = useState([])
  // mês extra criado pelo botão "+" nesta sessão (navegação à frente, ainda sem lançamento)
  const [extraMonth, setExtraMonth] = useState(null)
  const [refMonth, setRefMonth] = useState(() => {
    const base = monthsFromStart()
    return base.includes(monthKey()) ? monthKey() : base[base.length - 1]
  })
  // garante que a seleção automática do último mês só acontece na carga inicial,
  // sem "puxar" o usuário de volta depois que ele navega manualmente
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  // Busca os meses com dados no banco (funciona em qualquer dispositivo).
  const loadMonths = useCallback(async () => {
    if (!user) return
    const [exp, inc, sav] = await Promise.all([
      supabase.from('expenses').select('ref_month'),
      supabase.from('incomes').select('ref_month'),
      supabase.from('savings').select('ref_month'),
    ])
    const all = [
      ...(exp.data ?? []),
      ...(inc.data ?? []),
      ...(sav.data ?? []),
    ].map((r) => r.ref_month)
    const uniqueDbMonths = [...new Set(all.filter(Boolean))]
    setDbMonths(uniqueDbMonths)
    if (!hasAutoSelected) {
      const combined = [...new Set([...monthsFromStart(), ...uniqueDbMonths])].sort()
      setRefMonth(combined[combined.length - 1])
      setHasAutoSelected(true)
    }
  }, [user, hasAutoSelected])

  useEffect(() => {
    loadMonths()
  }, [loadMonths])

  // Lista final: base (set/2026 → mês atual) ∪ meses do banco ∪ mês extra em navegação.
  const months = useMemo(() => {
    const set = new Set([...monthsFromStart(), ...dbMonths])
    if (extraMonth) set.add(extraMonth)
    return [...set].sort()
  }, [dbMonths, extraMonth])

  // "+" apenas navega para o mês seguinte ao último (persiste de verdade
  // quando você lançar o primeiro item / usar "Trazer fixos").
  const addNextMonth = () => {
    const last = months[months.length - 1]
    const next = nextMonthKey(last)
    setExtraMonth(next)
    setRefMonth(next)
  }

  return (
    <MonthContext.Provider value={{ refMonth, setRefMonth, months, addNextMonth, reloadMonths: loadMonths }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  return useContext(MonthContext)
}
