import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { prevMonthKey } from '../lib/format'

// Compara o mês de referência com o mês anterior:
//  - gastos por categoria (barras lado a lado)
//  - totais de receita/despesa/saldo + variação %
export function useMonthComparison(refMonth) {
  const { user } = useAuth()
  const [current, setCurrent] = useState({ incomes: [], expenses: [] })
  const [previous, setPrevious] = useState({ incomes: [], expenses: [] })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !refMonth) return
    setLoading(true)
    const prev = prevMonthKey(refMonth)
    const grab = async (month) => {
      const [inc, exp] = await Promise.all([
        supabase.from('incomes').select('amount').eq('ref_month', month),
        supabase.from('expenses').select('amount, category').eq('ref_month', month),
      ])
      return { incomes: inc.data ?? [], expenses: exp.data ?? [] }
    }
    const [cur, pre] = await Promise.all([grab(refMonth), grab(prev)])
    setCurrent(cur)
    setPrevious(pre)
    setLoading(false)
  }, [user, refMonth])

  useEffect(() => {
    load()
  }, [load])

  const sum = (rows) => rows.reduce((s, r) => s + Number(r.amount), 0)
  const groupCat = (rows) => {
    const m = new Map()
    for (const r of rows) m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount))
    return m
  }

  const data = useMemo(() => {
    const curExp = groupCat(current.expenses)
    const preExp = groupCat(previous.expenses)
    const cats = new Set([...curExp.keys(), ...preExp.keys()])

    // barras por categoria, ordenadas pelo gasto atual
    const byCategory = [...cats]
      .map((name) => ({
        name,
        atual: curExp.get(name) ?? 0,
        anterior: preExp.get(name) ?? 0,
      }))
      .sort((a, b) => b.atual - a.atual)

    const totals = {
      incomeCur: sum(current.incomes),
      incomePrev: sum(previous.incomes),
      expenseCur: sum(current.expenses),
      expensePrev: sum(previous.expenses),
    }
    totals.balanceCur = totals.incomeCur - totals.expenseCur
    totals.balancePrev = totals.incomePrev - totals.expensePrev

    const pct = (cur, prev) => {
      if (!prev) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / Math.abs(prev)) * 100)
    }
    const deltas = {
      income: pct(totals.incomeCur, totals.incomePrev),
      expense: pct(totals.expenseCur, totals.expensePrev),
      balance: pct(totals.balanceCur, totals.balancePrev),
    }

    return { byCategory, totals, deltas }
  }, [current, previous])

  return { ...data, loading, reload: load }
}
