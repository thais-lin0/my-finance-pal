import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react'
import { monthLabel } from '../lib/format'

// Navegador de mês: ‹ Mês por extenso ›, com dropdown ao clicar no centro.
// `months` é a lista de chaves disponíveis (crescente). Setas respeitam os limites.
// `onAddNext` (opcional): quando no último mês, a › vira "adicionar próximo mês".
export default function MonthNavigator({ months, value, onChange, onAddNext }) {
  const [open, setOpen] = useState(false)
  const idx = months.indexOf(value)
  const canPrev = idx > 0
  const atEnd = idx === months.length - 1
  const canNext = idx >= 0 && !atEnd

  const go = (delta) => {
    const next = months[idx + delta]
    if (next) onChange(next)
  }

  // Seta pra frente: navega se houver próximo; senão, cria o próximo mês.
  const handleNext = () => {
    if (canNext) go(1)
    else if (onAddNext) onAddNext()
  }
  const nextIsAdd = atEnd && !!onAddNext
  const nextDisabled = !canNext && !onAddNext

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
        <button
          onClick={() => go(-1)}
          disabled={!canPrev}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700"
          title="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-[150px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <CalendarDays size={15} className="text-brand-500" />
          {monthLabel(value)}
        </button>

        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30 ${
            nextIsAdd
              ? 'text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700'
          }`}
          title={nextIsAdd ? 'Adicionar próximo mês' : 'Próximo mês'}
        >
          {nextIsAdd ? <Plus size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 max-h-72 w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            {[...months].reverse().map((m) => (
              <button
                key={m}
                onClick={() => {
                  onChange(m)
                  setOpen(false)
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  m === value
                    ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {monthLabel(m)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
