import { createContext, useContext, useState } from 'react'
import { monthKey, monthsFromStart, nextMonthKey } from '../lib/format'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const [months, setMonths] = useState(() => monthsFromStart())
  const [refMonth, setRefMonth] = useState(() => {
    const list = monthsFromStart()
    return list.includes(monthKey()) ? monthKey() : list[list.length - 1]
  })

  // Cria (se preciso) e navega para o mês seguinte ao último da lista.
  const addNextMonth = () => {
    setMonths((prev) => {
      const last = prev[prev.length - 1]
      const next = nextMonthKey(last)
      const updated = prev.includes(next) ? prev : [...prev, next]
      setRefMonth(next)
      return updated
    })
  }

  return (
    <MonthContext.Provider value={{ refMonth, setRefMonth, months, addNextMonth }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  return useContext(MonthContext)
}
