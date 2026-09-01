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

// Barras horizontais agrupadas: mês atual vs anterior por categoria.
// Horizontal lê melhor com rótulos de categoria longos e muitos itens;
// a distinção atual/anterior tem cor + posição (não só cor).
export default function MonthCompareChart({ data, currentLabel, prevLabel }) {
  if (!data.length) {
    return (
      <div className="grid h-72 place-items-center text-sm text-slate-400">
        Sem despesas para comparar.
      </div>
    )
  }
  const height = Math.max(260, data.length * 52)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barGap={2}
        barCategoryGap={14}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-ink-800" />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={116}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
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
        <Bar dataKey="anterior" fill="#94a3b8" radius={[0, 4, 4, 0]} name="anterior" isAnimationActive={false} />
        <Bar dataKey="atual" fill="#2d6bff" radius={[0, 4, 4, 0]} name="atual" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
