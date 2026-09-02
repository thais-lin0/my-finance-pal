import { useState } from 'react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { useWeek } from '../context/WeekContext'
import { useAgenda } from '../hooks/useAgenda'
import { WEEKDAYS, WEEKDAYS_SHORT, weekLabel, addDays, mondayOf } from '../lib/format'
import AddActivityModal from '../components/AddActivityModal'

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

export default function AgendaPage() {
  const { weekStart, prevWeek, nextWeek, thisWeek } = useWeek()
  const ag = useAgenda(weekStart)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [defaultWeekday, setDefaultWeekday] = useState(0)
  const [toast, setToast] = useState(null)
  const [bringing, setBringing] = useState(false)

  const isCurrentWeek = weekStart === mondayOf()

  const handleBringRecurring = async () => {
    setBringing(true)
    try {
      const n = await ag.bringRecurring()
      setToast(n === 0 ? 'Nenhuma atividade fixa nova para trazer.' : `Trazidas ${n} atividade(s) fixa(s).`)
    } catch (e) {
      setToast(`Erro: ${e.message}`)
    } finally {
      setBringing(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const openNew = (weekday) => {
    setEditing(null)
    setDefaultWeekday(weekday)
    setModal(true)
  }
  const openEdit = (a) => {
    setEditing(a)
    setModal(true)
  }
  const close = () => {
    setModal(false)
    setEditing(null)
  }
  const submit = (payload) =>
    editing ? ag.updateActivity(editing.id, payload) : ag.addActivity(payload)

  const cycleStatus = (a) => {
    const next =
      a.status === 'pendente' ? 'feito' : a.status === 'feito' ? 'nao_realizado' : 'pendente'
    ag.updateActivity(a.id, { status: next })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 lg:px-8">
      {/* cabeçalho */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Planejamento semanal</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-ink-700 dark:bg-ink-800">
            <button onClick={prevWeek} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700" title="Semana anterior">
              <ChevronLeft size={18} />
            </button>
            <span className="flex min-w-[120px] items-center justify-center gap-1.5 px-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <CalendarDays size={15} className="text-brand-500" />
              {weekLabel(weekStart)}
            </span>
            <button onClick={nextWeek} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700" title="Próxima semana">
              <ChevronRight size={18} />
            </button>
          </div>
          {!isCurrentWeek && (
            <button
              onClick={thisWeek}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-ink-700 dark:text-slate-300 dark:hover:bg-ink-800"
            >
              Hoje
            </button>
          )}
          <button
            onClick={handleBringRecurring}
            disabled={bringing}
            title="Copiar as atividades fixas da semana anterior"
            className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
          >
            <RefreshCw size={15} className={bringing ? 'animate-spin' : ''} /> Trazer fixas
          </button>
        </div>
      </header>

      {ag.error && <p className="rounded-xl bg-coral/10 px-4 py-2.5 text-sm text-coral">{ag.error}</p>}

      {/* progresso da semana */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {ag.stats.done} de {ag.stats.total} feitas
            {ag.stats.missed > 0 && ` · ${ag.stats.missed} não realizada(s)`}
          </span>
          <span className="text-slate-400">{ag.stats.pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-money transition-all" style={{ width: `${ag.stats.pct}%` }} />
        </div>
      </section>

      {/* grade semanal */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {WEEKDAYS.map((day, i) => {
          const dayKey = addDays(weekStart, i)
          const dayNum = new Date(dayKey + 'T00:00:00').getDate()
          const activities = ag.byDay[i]
          return (
            <div
              key={day}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-card dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">{WEEKDAYS_SHORT[i]}</p>
                  <p className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">{dayNum}</p>
                </div>
                <button
                  onClick={() => openNew(i)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-ink-800"
                  title={`Adicionar em ${day}`}
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {activities.length === 0 && (
                  <button
                    onClick={() => openNew(i)}
                    className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-300 hover:border-brand-300 hover:text-brand-400 dark:border-ink-700"
                  >
                    + atividade
                  </button>
                )}
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className={`group rounded-lg border-l-4 bg-slate-50 p-2 dark:bg-ink-800/60 ${
                      catColor[a.category] ?? 'border-l-slate-300'
                    } ${statusRing[a.status] ?? ''}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {a.title}
                        {a.is_recurring && (
                          <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-brand-600 dark:bg-brand-900/40">
                            fixo
                          </span>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => openEdit(a)} className="rounded p-0.5 text-slate-400 hover:text-brand-500" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${a.title}"?`)) ag.removeActivity(a.id)
                          }}
                          className="rounded p-0.5 text-slate-400 hover:text-coral"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {(a.start_time || a.category) && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                        {a.start_time && (
                          <span className="inline-flex items-center gap-0.5">
                            <Clock size={10} />
                            {a.start_time.slice(0, 5)}
                            {a.end_time ? `–${a.end_time.slice(0, 5)}` : ''}
                          </span>
                        )}
                        <span className="rounded-full bg-white px-1.5 py-0.5 dark:bg-ink-900">{a.category}</span>
                      </div>
                    )}
                    <button
                      onClick={() => cycleStatus(a)}
                      className={`mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition ${
                        a.status === 'feito'
                          ? 'bg-money/15 text-money'
                          : a.status === 'nao_realizado'
                          ? 'bg-coral/15 text-coral'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-ink-700 dark:text-slate-300'
                      }`}
                      title="Clique para alternar: pendente → feito → não realizado"
                    >
                      {a.status === 'feito' && (<><Check size={12} /> Feito</>)}
                      {a.status === 'nao_realizado' && (<><X size={12} /> Não realizado</>)}
                      {a.status === 'pendente' && 'Pendente'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <AddActivityModal
        open={modal}
        initial={editing}
        defaultWeekday={defaultWeekday}
        onClose={close}
        onSubmit={submit}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-ink-700">
          {toast}
        </div>
      )}
    </div>
  )
}
