import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { formatBRL } from '../lib/format'

// Card de total com variação % vs mês anterior.
// `goodWhenUp`: true para receita (subir é bom), false para despesa (subir é ruim).
export default function DeltaCard({ label, value, delta, goodWhenUp = true, accent }) {
  const up = delta > 0
  const flat = delta === 0
  const isGood = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown

  const deltaColor = flat
    ? 'text-slate-400'
    : isGood
    ? 'text-money'
    : 'text-coral'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 tnum dark:text-white">
        {formatBRL(value)}
      </p>
      <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
        <Icon size={13} />
        {flat ? 'sem mudança' : `${up ? '+' : ''}${delta}% vs mês anterior`}
      </div>
    </div>
  )
}
