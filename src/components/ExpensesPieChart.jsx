import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatBRL } from '../lib/format'

const COLORS = [
  '#2d6bff',
  '#f26b5e',
  '#0fa968',
  '#8b5cf6',
  '#e8a33d',
  '#06b6d4',
  '#ec4899',
  '#94a3b8',
]

export default function ExpensesPieChart({ data }) {
  if (!data.length) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-400">
        Sem despesas neste mês.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatBRL(v)} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
