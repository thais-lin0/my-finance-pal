import { Check, X, Pencil, Trash2, Clock } from 'lucide-react'

// Cores por categoria: escala padrão do Tailwind no claro; no escuro, cor SÓLIDA
// (sem opacidade) num tom médio-escuro (*-900). Cor escura + opacidade baixa sobre
// um fundo já quase preto (ink-950) só gera mancha lavada, nunca uma cor viva.
// Corrida usa "orange" (não "amber") porque tailwind.config.js redefine "amber" como
// uma cor única (#e8a33d, sem escala 50-900) para os selos de pendência do financeiro,
// o que apaga bg-amber-100/200/etc — a classe existia no JSX mas não gerava CSS nenhum.
const catBg = {
  Treino: 'bg-brand-100 dark:bg-brand-900',
  Academia: 'bg-violet-100 dark:bg-violet-900',
  Futebol: 'bg-emerald-100 dark:bg-emerald-900',
  Corrida: 'bg-orange-100 dark:bg-orange-900',
  Estudo: 'bg-cyan-100 dark:bg-cyan-900',
  Trabalho: 'bg-slate-200 dark:bg-ink-700',
  Lazer: 'bg-pink-100 dark:bg-pink-900',
  Outro: 'bg-stone-200 dark:bg-ink-700',
}

const statusOpacity = {
  feito: 'opacity-70',
  nao_realizado: 'opacity-60',
  pendente: '',
}

const tickStyle = {
  feito: 'border-money bg-money text-white',
  nao_realizado: 'border-coral bg-coral text-white',
  pendente: 'border-slate-300 bg-white text-transparent hover:border-brand-400 dark:border-ink-700 dark:bg-ink-900',
}

// Card de atividade compartilhado entre as visões Lista e Quadro.
// Na visão Quadro, `draggable` habilita o arrastar-e-soltar entre colunas (dias).
export default function ActivityCard({ activity: a, onEdit, onDelete, onCycleStatus, draggable = false, onDragStart, onDragEnd, dragging = false }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group rounded-xl p-3 transition ${catBg[a.category] ?? 'bg-slate-50 dark:bg-ink-800/60'} ${
        statusOpacity[a.status] ?? ''
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging ? 'opacity-40 ring-2 ring-brand-400' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => onCycleStatus(a)}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
            tickStyle[a.status] ?? tickStyle.pendente
          }`}
          title="Clique para alternar: pendente → feito → não realizado"
        >
          {a.status === 'feito' && <Check size={14} strokeWidth={3} />}
          {a.status === 'nao_realizado' && <X size={14} strokeWidth={3} />}
          {a.status === 'pendente' && <Check size={14} strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`font-medium text-slate-800 dark:text-slate-100 ${
                a.status === 'nao_realizado' ? 'line-through' : ''
              }`}
            >
              {a.title}
              {a.is_recurring && (
                <span className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-600 dark:bg-black/20">
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
            <span className="rounded-full bg-white/70 px-2 py-0.5 dark:bg-black/20">{a.category}</span>
            {a.calories_burned != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                🔥 {a.calories_burned} kcal
              </span>
            )}
          </div>

          {a.notes && <p className="mt-1.5 text-xs text-slate-400">{a.notes}</p>}
        </div>
      </div>
    </div>
  )
}
