import { Pencil, Trash2 } from 'lucide-react'
import { formatBRL } from '../lib/format'

// Lista compacta de receitas ou poupança, com editar e excluir.
export default function SimpleList({ rows, labelField, table, onDelete, onEdit, emptyText }) {
  if (!rows.length) {
    return <p className="py-4 text-center text-sm text-slate-400">{emptyText}</p>
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-ink-800/60">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between py-2.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {r[labelField]}
            {r.is_recurring && (
              <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-600 dark:bg-brand-900/40">
                fixo
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 tnum dark:text-white">
              {formatBRL(r.amount)}
            </span>
            {onEdit && (
              <button
                onClick={() => onEdit(r)}
                className="rounded-md p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-ink-800"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(`Excluir "${r[labelField]}"?`)) onDelete(table, r.id)
              }}
              className="rounded-md p-1 text-slate-400 hover:bg-coral/10 hover:text-coral"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
