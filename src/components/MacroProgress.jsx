// Barras de progresso de macros vs meta do dia (+ água, opcional).
const rows = [
  { key: 'calories', label: 'Calorias', unit: 'kcal', color: 'bg-brand-500' },
  { key: 'protein_g', label: 'Proteína', unit: 'g', color: 'bg-money' },
  { key: 'carbs_g', label: 'Carboidrato', unit: 'g', color: 'bg-amber' },
  { key: 'fat_g', label: 'Gordura', unit: 'g', color: 'bg-coral' },
]

const WATER_QUICK_ADD = [200, 300, 500]

export default function MacroProgress({ totals, goals, water, onAddWater, onUndoWater }) {
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

      {water && (
        <div className="border-t border-slate-100 pt-3 dark:border-ink-800">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">💧 Água</span>
            <span className="tnum text-slate-500 dark:text-slate-400">
              {water.total} / {water.goal} ml
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${water.goal > 0 ? Math.min(100, Math.round((water.total / water.goal) * 100)) : 0}%` }}
            />
          </div>
          {onAddWater && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {WATER_QUICK_ADD.map((ml) => (
                <button
                  key={ml}
                  onClick={() => onAddWater(ml)}
                  className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300"
                >
                  +{ml}ml
                </button>
              ))}
              {onUndoWater && water.total > 0 && (
                <button onClick={onUndoWater} className="ml-auto text-xs text-slate-400 hover:text-coral">
                  desfazer última
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
