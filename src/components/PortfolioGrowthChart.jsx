import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL, monthLabel } from '../lib/format'

// Evolução do patrimônio acumulado ao longo dos meses de aporte.
export default function PortfolioGrowthChart({ data }) {
  if (data.length < 2) {
    return (
      <div className="grid h-56 place-items-center text-sm text-slate-400">
        Adicione aportes em meses diferentes para ver a evolução.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d6bff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2d6bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-ink-800" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          tickFormatter={(m) => monthLabel(m).slice(0, 3)}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={44} />
        <Tooltip
          formatter={(v, name) => [formatBRL(v), name === 'acumulado' ? 'Acumulado' : 'Aporte no mês']}
          labelFormatter={(m) => monthLabel(m)}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(0,0,0,.2)' }}
        />
        <Area
          type="monotone"
          dataKey="acumulado"
          stroke="#2d6bff"
          strokeWidth={2.5}
          fill="url(#grad)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
