import { useState } from 'react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Rows3,
  Columns3,
} from 'lucide-react'
import { useWeek } from '../context/WeekContext'
import { useAgenda } from '../hooks/useAgenda'
import { WEEKDAYS, WEEKDAYS_SHORT, weekLabel, addDays, mondayOf } from '../lib/format'
import AddActivityModal from '../components/AddActivityModal'
import ActivityCard from '../components/ActivityCard'
import Modal from '../components/Modal'

const todayIdx = () => (new Date().getDay() + 6) % 7 // 0=Seg

export default function AgendaPage() {
  const { weekStart, prevWeek, nextWeek, thisWeek } = useWeek()
  const ag = useAgenda(weekStart)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [defaultWeekday, setDefaultWeekday] = useState(0)
  const [toast, setToast] = useState(null)
  const [bringing, setBringing] = useState(false)
  const [view, setView] = useState(() => localStorage.getItem('mlp.agendaView') || 'lista')

  const isCurrentWeek = weekStart === mondayOf()

  const setViewPersist = (v) => {
    setView(v)
    localStorage.setItem('mlp.agendaView', v)
  }

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

  const openNew = (weekday) => { setEditing(null); setDefaultWeekday(weekday); setModal(true) }
  const openEdit = (a) => { setEditing(a); setModal(true) }
  const close = () => { setModal(false); setEditing(null) }
  const submit = (payload) => (editing ? ag.updateActivity(editing.id, payload) : ag.addActivity(payload))

  // Modal de calorias gastas — abre ao MARCAR uma atividade como concluída.
  const [calModal, setCalModal] = useState(null) // { activity, value }
  const cycleStatus = (a) => {
    const next = a.status === 'pendente' ? 'feito' : a.status === 'feito' ? 'nao_realizado' : 'pendente'
    if (next === 'feito') {
      // ao concluir, pede as calorias gastas (pré-preenche se já houver)
      setCalModal({ activity: a, value: a.calories_burned ?? '' })
      return
    }
    // ao sair de "feito", zera as calorias registradas
    const patch = { status: next }
    if (a.status === 'feito') patch.calories_burned = null
    ag.updateActivity(a.id, patch)
  }
  const saveCalories = () => {
    if (!calModal) return
    const kcal = calModal.value === '' ? null : Number(calModal.value) || 0
    ag.updateActivity(calModal.activity.id, { status: 'feito', calories_burned: kcal })
    setCalModal(null)
  }

  const cardProps = { onEdit: openEdit, onDelete: ag.removeActivity, onCycleStatus: cycleStatus }
  const cur = todayIdx()

  // ── Arrastar-e-soltar entre colunas (visão Quadro) ──
  const [dragId, setDragId] = useState(null)
  const [dragFrom, setDragFrom] = useState(null)
  const [dropCol, setDropCol] = useState(null) // coluna destacada durante o hover
  const onDragStart = (a) => (e) => {
    setDragId(a.id)
    setDragFrom(a.weekday)
    e.dataTransfer.effectAllowed = 'move'
    // necessário no Firefox pra o drag iniciar
    try { e.dataTransfer.setData('text/plain', String(a.id)) } catch { /* ignore */ }
  }
  const onDragEnd = () => { setDragId(null); setDragFrom(null); setDropCol(null) }
  const onColumnDrop = (weekday) => (e) => {
    e.preventDefault()
    setDropCol(null)
    if (dragId == null || weekday === dragFrom) { onDragEnd(); return }
    // otimista: updateActivity já atualiza o estado local sem refetch (não pisca)
    ag.updateActivity(dragId, { weekday })
    onDragEnd()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
      {/* cabeçalho */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Planejamento semanal</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Agenda</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* alternador de visão */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-ink-700 dark:bg-ink-800">
            <button
              onClick={() => setViewPersist('lista')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${view === 'lista' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700'}`}
              title="Ver como lista"
            >
              <Rows3 size={15} /> Lista
            </button>
            <button
              onClick={() => setViewPersist('quadro')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${view === 'quadro' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700'}`}
              title="Ver como quadro"
            >
              <Columns3 size={15} /> Quadro
            </button>
          </div>

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
            <button onClick={thisWeek} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-ink-700 dark:text-slate-300 dark:hover:bg-ink-800">
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

      {/* ── VISÃO LISTA: cada dia ocupa a largura toda ── */}
      {view === 'lista' && (
        <section className="space-y-4">
          {WEEKDAYS.map((day, i) => {
            const dayKey = addDays(weekStart, i)
            const dayNum = new Date(dayKey + 'T00:00:00').getDate()
            const activities = ag.byDay[i]
            const isToday = isCurrentWeek && i === cur
            return (
              <div
                key={day}
                className={`rounded-2xl border bg-white p-5 shadow-card dark:bg-ink-900 ${
                  isToday ? 'border-brand-300 dark:border-brand-800' : 'border-slate-200 dark:border-ink-800'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">{day}</h3>
                    <span className="text-sm text-slate-400">dia {dayNum}</span>
                    {isToday && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">hoje</span>}
                  </div>
                  <button
                    onClick={() => openNew(i)}
                    className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300"
                  >
                    <Plus size={15} /> Atividade
                  </button>
                </div>
                {activities.length === 0 ? (
                  <button
                    onClick={() => openNew(i)}
                    className="w-full rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm text-slate-300 hover:border-brand-300 hover:text-brand-400 dark:border-ink-700"
                  >
                    Nada planejado — adicionar atividade
                  </button>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activities.map((a) => (
                      <ActivityCard key={a.id} activity={a} {...cardProps} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ── VISÃO QUADRO: colunas largas e altas com scroll (estilo Trello) ── */}
      {view === 'quadro' && (
        <section className="-mx-5 overflow-x-auto px-5 pb-2 lg:-mx-8 lg:px-8">
          <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
            {WEEKDAYS.map((day, i) => {
              const dayKey = addDays(weekStart, i)
              const dayNum = new Date(dayKey + 'T00:00:00').getDate()
              const activities = ag.byDay[i]
              const isToday = isCurrentWeek && i === cur
              return (
                <div
                  key={day}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropCol !== i) setDropCol(i) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropCol((c) => (c === i ? null : c)) }}
                  onDrop={onColumnDrop(i)}
                  className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-50/60 transition dark:bg-ink-950/40 ${
                    dropCol === i && dragFrom !== i
                      ? 'border-brand-400 ring-2 ring-brand-300 dark:border-brand-600'
                      : isToday
                        ? 'border-brand-300 dark:border-brand-800'
                        : 'border-slate-200 dark:border-ink-800'
                  }`}
                  style={{ height: 'calc(100vh - 320px)', minHeight: '420px' }}
                >
                  {/* cabeçalho fixo da coluna */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {WEEKDAYS_SHORT[i]} {isToday && <span className="text-brand-500">• hoje</span>}
                      </p>
                      <p className="font-display text-xl font-bold text-slate-800 dark:text-slate-100">{dayNum}</p>
                    </div>
                    <button
                      onClick={() => openNew(i)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-ink-800"
                      title={`Adicionar em ${day}`}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {/* área de cards com scroll próprio */}
                  <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
                    {activities.length === 0 && (
                      <button
                        onClick={() => openNew(i)}
                        className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm text-slate-300 hover:border-brand-300 hover:text-brand-400 dark:border-ink-700"
                      >
                        + atividade
                      </button>
                    )}
                    {activities.map((a) => (
                      <ActivityCard
                        key={a.id}
                        activity={a}
                        {...cardProps}
                        draggable
                        onDragStart={onDragStart(a)}
                        onDragEnd={onDragEnd}
                        dragging={dragId === a.id}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <AddActivityModal
        open={modal}
        initial={editing}
        defaultWeekday={defaultWeekday}
        onClose={close}
        onSubmit={submit}
      />

      <Modal
        open={!!calModal}
        title="Concluir atividade"
        onClose={() => setCalModal(null)}
      >
        {calModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Quantas calorias você gastou em <strong>{calModal.activity.title}</strong>?
              <span className="mt-1 block text-xs text-slate-400">
                Some ao total de calorias gastas do dia (Diário da Nutrição). Deixe em branco se não souber.
              </span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={calModal.value}
                onChange={(e) => setCalModal((s) => ({ ...s, value: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveCalories()}
                placeholder="ex: 350"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-slate-100"
              />
              <span className="text-sm text-slate-400">kcal</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  // conclui sem registrar calorias
                  ag.updateActivity(calModal.activity.id, { status: 'feito', calories_burned: null })
                  setCalModal(null)
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-800"
              >
                Pular
              </button>
              <button
                onClick={saveCalories}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-ink-700">
          {toast}
        </div>
      )}
    </div>
  )
}
