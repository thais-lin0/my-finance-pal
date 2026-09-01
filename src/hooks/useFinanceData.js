import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { prevMonthKey } from '../lib/format'

// Reaproveita o dia do vencimento antigo no mês de referência atual.
// Ex: due antigo 05/09 + refMonth 2026-10-01 -> 2026-10-05.
function shiftDueDate(oldDue, refMonth) {
  if (!oldDue) return null
  const day = new Date(oldDue + 'T00:00:00').getDate()
  const base = new Date(refMonth + 'T00:00:00')
  // clamp para não estourar em meses curtos (ex: dia 31 em fevereiro)
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(day, lastDay)
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const d = String(safeDay).padStart(2, '0')
  return `${base.getFullYear()}-${m}-${d}`
}

// Carrega e gerencia receitas, despesas e poupança de um mês de referência.
export function useFinanceData(refMonth) {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState([])
  const [expenses, setExpenses] = useState([])
  const [savings, setSavings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // sugestões vindas de TODOS os meses do usuário (memória p/ dropdowns)
  const [suggestions, setSuggestions] = useState({
    incomeSources: [],
    savingKinds: [],
    expenseItems: [], // { description, category, amount } mais recente por descrição
  })

  const loadSuggestions = useCallback(async () => {
    if (!user) return
    const [inc, sav, exp] = await Promise.all([
      supabase.from('incomes').select('description').order('created_at', { ascending: false }),
      supabase.from('savings').select('kind').order('created_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('description, category, amount')
        .order('created_at', { ascending: false }),
    ])
    const uniq = (arr) => [...new Set(arr.filter(Boolean))]
    const incomeSources = uniq((inc.data ?? []).map((r) => r.description.trim()))
    const savingKinds = uniq((sav.data ?? []).map((r) => r.kind.trim()))
    // guarda a ocorrência mais recente de cada descrição (categoria/valor default)
    const seen = new Map()
    for (const e of exp.data ?? []) {
      const key = e.description.trim().toLowerCase()
      if (!seen.has(key))
        seen.set(key, { description: e.description.trim(), category: e.category, amount: e.amount })
    }
    setSuggestions({ incomeSources, savingKinds, expenseItems: [...seen.values()] })
  }, [user])

  const load = useCallback(async () => {
    if (!user || !refMonth) return
    setLoading(true)
    setError(null)
    try {
      const [inc, exp, sav] = await Promise.all([
        supabase.from('incomes').select('*').eq('ref_month', refMonth).order('created_at'),
        supabase.from('expenses').select('*').eq('ref_month', refMonth).order('due_date', { nullsFirst: false }),
        supabase.from('savings').select('*').eq('ref_month', refMonth).order('created_at'),
      ])
      if (inc.error) throw inc.error
      if (exp.error) throw exp.error
      if (sav.error) throw sav.error
      setIncomes(inc.data ?? [])
      setExpenses(exp.data ?? [])
      setSavings(sav.data ?? [])
    } catch (e) {
      setError(e.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [user, refMonth])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  // ── Mutations ──────────────────────────────────────────
  const addIncome = async (payload) => {
    const { error } = await supabase
      .from('incomes')
      .insert({ ...payload, user_id: user.id, ref_month: refMonth })
    if (error) throw error
    await load()
    await loadSuggestions()
  }

  const addExpense = async (payload) => {
    const { error } = await supabase
      .from('expenses')
      .insert({ ...payload, user_id: user.id, ref_month: refMonth })
    if (error) throw error
    await load()
    await loadSuggestions()
  }

  const addSaving = async (payload) => {
    const { error } = await supabase
      .from('savings')
      .insert({ ...payload, user_id: user.id, ref_month: refMonth })
    if (error) throw error
    await load()
    await loadSuggestions()
  }

  const toggleExpensePaid = async (id, isPaid) => {
    const { error } = await supabase.from('expenses').update({ is_paid: isPaid }).eq('id', id)
    if (error) throw error
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, is_paid: isPaid } : e)))
  }

  const removeRow = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    await load()
  }

  // Atualiza um registro qualquer (edição inline / modal de edição).
  const updateRow = async (table, id, patch) => {
    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) throw error
    await load()
    if (table !== 'savings') await loadSuggestions()
  }

  // Ações em lote sobre despesas.
  const bulkUpdate = async (ids, patch) => {
    if (!ids.length) return
    const { error } = await supabase.from('expenses').update(patch).in('id', ids)
    if (error) throw error
    await load()
  }

  const bulkDelete = async (ids) => {
    if (!ids.length) return
    const { error } = await supabase.from('expenses').delete().in('id', ids)
    if (error) throw error
    await load()
  }

  // Copia os itens fixos (is_recurring) do mês anterior para o mês atual,
  // pulando os que já existem aqui (comparação por nome). Retorna quantos criou.
  const bringRecurring = async () => {
    if (!user || !refMonth) return { incomes: 0, expenses: 0 }
    const prev = prevMonthKey(refMonth)

    const [prevInc, prevExp] = await Promise.all([
      supabase
        .from('incomes')
        .select('description, amount, is_recurring')
        .eq('ref_month', prev)
        .eq('is_recurring', true),
      supabase
        .from('expenses')
        .select('description, category, amount, due_date, notes, is_recurring')
        .eq('ref_month', prev)
        .eq('is_recurring', true),
    ])
    if (prevInc.error) throw prevInc.error
    if (prevExp.error) throw prevExp.error

    // nomes já existentes no mês atual, para não duplicar
    const existingInc = new Set(incomes.map((i) => i.description.trim().toLowerCase()))
    const existingExp = new Set(expenses.map((e) => e.description.trim().toLowerCase()))

    const incToAdd = (prevInc.data ?? [])
      .filter((i) => !existingInc.has(i.description.trim().toLowerCase()))
      .map((i) => ({
        user_id: user.id,
        ref_month: refMonth,
        description: i.description,
        amount: i.amount,
        is_recurring: true,
      }))

    const expToAdd = (prevExp.data ?? [])
      .filter((e) => !existingExp.has(e.description.trim().toLowerCase()))
      .map((e) => ({
        user_id: user.id,
        ref_month: refMonth,
        description: e.description,
        category: e.category,
        amount: e.amount,
        // desloca o vencimento para o mesmo dia no mês atual
        due_date: shiftDueDate(e.due_date, refMonth),
        notes: e.notes,
        is_recurring: true,
        is_paid: false,
      }))

    if (incToAdd.length) {
      const { error } = await supabase.from('incomes').insert(incToAdd)
      if (error) throw error
    }
    if (expToAdd.length) {
      const { error } = await supabase.from('expenses').insert(expToAdd)
      if (error) throw error
    }

    await load()
    return { incomes: incToAdd.length, expenses: expToAdd.length }
  }

  // ── Derivados ──────────────────────────────────────────
  const totals = useMemo(() => {
    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0)
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalSavings = savings.reduce((s, v) => s + Number(v.amount), 0)
    const paid = expenses.filter((e) => e.is_paid).reduce((s, e) => s + Number(e.amount), 0)
    const remaining = totalExpenses - paid
    const cashBalance = totalIncome - totalExpenses
    const paidPct = totalExpenses > 0 ? Math.round((paid / totalExpenses) * 100) : 0
    return { totalIncome, totalExpenses, totalSavings, paid, remaining, cashBalance, paidPct }
  }, [incomes, expenses, savings])

  // Gastos agrupados por categoria (para o gráfico de pizza)
  const byCategory = useMemo(() => {
    const map = new Map()
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount))
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  return {
    incomes,
    expenses,
    savings,
    loading,
    error,
    totals,
    byCategory,
    reload: load,
    addIncome,
    addExpense,
    addSaving,
    toggleExpensePaid,
    removeRow,
    updateRow,
    bulkUpdate,
    bulkDelete,
    bringRecurring,
    suggestions,
  }
}
