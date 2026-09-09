import { Check, X, Pencil, Trash2, Clock } from 'lucide-react'

const catColor = {
  Treino: 'border-l-brand-500',
  Academia: 'border-l-violet-500',
  Futebol: 'border-l-money',
  Corrida: 'border-l-amber',
  Estudo: 'border-l-cyan-500',
  Trabalho: 'border-l-slate-400',
  Lazer: 'border-l-pink-500',
  Outro: 'border-l-slate-300',
}

const statusRing = {
  feito: 'opacity-60',
  nao_realizado: 'opacity-50 line-through',
  pendente: '',
}

// Card de atividade compartilhado entre as visões Lista e Quadro.
export default function ActivityCard({ activity: a, onEdit, onDelete, onCycleStatus }) {
  return (
    <div
      className={`group rounded-xl border border-slate-100 border-l-4 bg-white p-3 shadow-sm dark:border-ink-800 dark:bg-ink-900 ${
        catColor[a.category] ?? 'border-l-slate-300'
      } ${statusRing[a.status] ?? ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {a.title}
          {a.is_recurring && (
            <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-600 dark:bg-brand-900/40">
              fixo
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button onClick={() => onEdit(a)} className="rounded p-1 text-slate-400 hover:text-brand-500" title="Editar">
            <Pencil size={15} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Excluir "${a.title}"?`)) onDelete(a.id)
            }}
            className="rounded p-1 text-slate-400 hover:text-coral"
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {a.start_time && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {a.start_time.slice(0, 5)}
            {a.end_time ? `–${a.end_time.slice(0, 5)}` : ''}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-ink-800">{a.category}</span>
      </div>

      {a.notes && <p className="mt-1.5 text-xs text-slate-400">{a.notes}</p>}

      <button
        onClick={() => onCycleStatus(a)}
        className={`mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
          a.status === 'feito'
            ? 'bg-money/15 text-money'
            : a.status === 'nao_realizado'
            ? 'bg-coral/15 text-coral'
            : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-ink-700 dark:text-slate-300'
        }`}
        title="Clique para alternar: pendente → feito → não realizado"
      >
        {a.status === 'feito' && (<><Check size={13} /> Feito</>)}
        {a.status === 'nao_realizado' && (<><X size={13} /> Não realizado</>)}
        {a.status === 'pendente' && 'Pendente'}
      </button>
    </div>
  )
}
