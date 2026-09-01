import { formatBRL } from '../lib/format'

const PALETTE = ['#2d6bff', '#0fa968', '#f26b5e', '#e8a33d', '#8b5cf6', '#06b6d4', '#ec4899', '#94a3b8']

// Barra de proporção (100% stacked) + legenda com %: mostra a fatia de cada
// categoria no total de gastos. Proporção lida por comprimento, com rótulo de %.
export default function CategoryShareBar({ data, total }) {
  if (!data.length || !total) {
    return (
      <div className="grid h-40 place-items-center text-sm text-slate-400">
        Sem despesas neste mês.
      </div>
    )
  }
  const withPct = data.map((d, i) => ({
    ...d,
    pct: Math.round((d.value / total) * 100),
    color: PALETTE[i % PALETTE.length],
  }))

  return (
    <div>
      {/* barra empilhada */}
      <div className="flex h-8 w-full overflow-hidden rounded-lg" role="img" aria-label="Proporção de gastos por categoria">
        {withPct.map((d) => (
          <div
            key={d.name}
            className="group relative h-full"
            style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
            title={`${d.name}: ${formatBRL(d.value)} (${d.pct}%)`}
          >
            {d.pct >= 8 && (
              <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-white">
                {d.pct}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* legenda com quadrado de cor + nome + % + valor */}
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {withPct.map((d) => (
          <li key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="tnum text-slate-500 dark:text-slate-400">
              {d.pct}% · {formatBRL(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
