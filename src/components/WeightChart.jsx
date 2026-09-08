import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateBR } from '../lib/format'

// Evolução do peso ao longo do tempo.
export default function WeightChart({ data }) {
  if (data.length < 2) {
    return (
      <div className="grid h-56 place-items-center text-sm text-slate-400">
        Registre pelo menos 2 medições para ver a evolução.
      </div>
    )
  }
  const points = data
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.measured_at, peso: Number(m.weight_kg) }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0fa968" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0fa968" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-ink-800" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => formatDateBR(d).slice(0, 5)} />
        <YAxis tick={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} width={38} />
        <Tooltip
          formatter={(v) => [`${v} kg`, 'Peso']}
          labelFormatter={(d) => formatDateBR(d)}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(0,0,0,.2)' }}
        />
        <Area type="monotone" dataKey="peso" stroke="#0fa968" strokeWidth={2.5} fill="url(#w)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
