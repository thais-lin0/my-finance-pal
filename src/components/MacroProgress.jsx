// Barras de progresso de macros vs meta do dia.
const rows = [
  { key: 'calories', label: 'Calorias', unit: 'kcal', color: 'bg-brand-500' },
  { key: 'protein_g', label: 'Proteína', unit: 'g', color: 'bg-money' },
  { key: 'carbs_g', label: 'Carboidrato', unit: 'g', color: 'bg-amber' },
  { key: 'fat_g', label: 'Gordura', unit: 'g', color: 'bg-coral' },
]

export default function MacroProgress({ totals, goals }) {
  return (
    <div className="space-y-3">
      {rows.map(({ key, label, unit, color }) => {
        const val = Math.round(Number(totals[key] || 0))
        const goal = Number(goals[key] || 0)
        const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0
        const over = goal > 0 && val > goal
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
              <span className="tnum text-slate-500 dark:text-slate-400">
                {val} / {goal} {unit}
                {over && <span className="ml-1 text-coral">acima</span>}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
              <div
                className={`h-full rounded-full transition-all ${over ? 'bg-coral' : color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
