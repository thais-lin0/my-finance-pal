import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../lib/format'

// Barras horizontais ordenadas por valor: posição/comprimento (encoding mais
// preciso que o ângulo de uma pizza) e cada barra rotulada — não depende de cor.
const PALETTE = ['#2d6bff', '#0fa968', '#f26b5e', '#e8a33d', '#8b5cf6', '#06b6d4', '#ec4899', '#94a3b8']

export default function CategoryBars({ data, total }) {
  if (!data.length) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-400">
        Sem despesas neste mês.
      </div>
    )
  }
  // altura proporcional ao nº de categorias, com um piso confortável
  const height = Math.max(220, data.length * 44)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
        barCategoryGap={10}
      >
        <XAxis type="number" hide />
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
          formatter={(v) => [
            `${formatBRL(v)}${total ? ` · ${Math.round((v / total) * 100)}%` : ''}`,
            'Gasto',
          ]}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(0,0,0,.2)' }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => formatBRL(v)}
            className="fill-slate-500 dark:fill-slate-400"
            style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
