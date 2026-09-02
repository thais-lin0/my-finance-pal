import { createContext, useContext, useState } from 'react'
import { mondayOf, addDays } from '../lib/format'

const WeekContext = createContext(null)

export function WeekProvider({ children }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf())
  const prevWeek = () => setWeekStart((w) => addDays(w, -7))
  const nextWeek = () => setWeekStart((w) => addDays(w, 7))
  const thisWeek = () => setWeekStart(mondayOf())
  return (
    <WeekContext.Provider value={{ weekStart, setWeekStart, prevWeek, nextWeek, thisWeek }}>
      {children}
    </WeekContext.Provider>
  )
}

export function useWeek() {
  return useContext(WeekContext)
}
