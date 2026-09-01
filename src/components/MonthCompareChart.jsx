import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../lib/format'

// Barras agrupadas: gasto por categoria no mês atual vs mês anterior.
export default function MonthCompareChart({ data, currentLabel, prevLabel }) {
  if (!data.length) {
    return (
      <div className="grid h-72 place-items-center text-sm text-slate-400">
        Sem despesas para comparar.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-ink-800" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={56}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={44} />
        <Tooltip
          formatter={(v, name) => [formatBRL(v), name === 'anterior' ? prevLabel : currentLabel]}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(0,0,0,.2)' }}
        />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {value === 'anterior' ? prevLabel : currentLabel}
            </span>
          )}
        />
        <Bar dataKey="anterior" fill="#94a3b8" radius={[5, 5, 0, 0]} name="anterior" />
        <Bar dataKey="atual" fill="#2d6bff" radius={[5, 5, 0, 0]} name="atual" />
      </BarChart>
    </ResponsiveContainer>
  )
}
