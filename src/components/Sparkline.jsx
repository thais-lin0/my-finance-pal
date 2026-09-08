import { Area, AreaChart, ResponsiveContainer } from 'recharts'

// Mini gráfico de tendência (sem eixos), para os cards de meta.
export default function Sparkline({ data, dataKey = 'v', color = '#0fa968', height = 40 }) {
  if (!data || data.length < 2) {
    return <div style={{ height }} className="grid place-items-center text-[10px] text-slate-300">sem dados</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sl-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#sl-${dataKey})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
