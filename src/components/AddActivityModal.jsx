import { useEffect, useState } from 'react'
import Modal from './Modal'
import { ACTIVITY_CATEGORIES, WEEKDAYS } from '../lib/format'

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

const empty = {
  title: '',
  category: 'Treino',
  weekday: 0,
  start_time: '',
  end_time: '',
  notes: '',
  is_recurring: false,
}

// initial: atividade em edição (ou null). defaultWeekday: dia pré-selecionado ao criar.
export default function AddActivityModal({ open, onClose, onSubmit, initial = null, defaultWeekday = 0 }) {
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const editing = Boolean(initial)

  useEffect(() => {
    if (open && initial) {
      setForm({
        title: initial.title ?? '',
        category: initial.category ?? 'Treino',
        weekday: initial.weekday ?? 0,
        start_time: initial.start_time ?? '',
        end_time: initial.end_time ?? '',
        notes: initial.notes ?? '',
        is_recurring: Boolean(initial.is_recurring),
      })
    }
    if (open && !initial) setForm({ ...empty, weekday: defaultWeekday })
  }, [open, initial, defaultWeekday])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await onSubmit({
        title: form.title.trim(),
        category: form.category,
        weekday: Number(form.weekday),
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: form.notes.trim() || null,
        is_recurring: form.is_recurring,
      })
      onClose()
    } catch (e2) {
      setErr(e2.message ?? 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={editing ? 'Editar atividade' : 'Nova atividade'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input
          className={inputCls}
          placeholder="Título (ex: Academia - perna)"
          required
          value={form.title}
          onChange={set('title')}
        />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputCls} value={form.category} onChange={set('category')}>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className={inputCls} value={form.weekday} onChange={set('weekday')}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Início
            <input className={`${inputCls} mt-1`} type="time" value={form.start_time} onChange={set('start_time')} />
          </label>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Fim
            <input className={`${inputCls} mt-1`} type="time" value={form.end_time} onChange={set('end_time')} />
          </label>
        </div>
        <input
          className={inputCls}
          placeholder="Observação (opcional)"
          value={form.notes}
          onChange={set('notes')}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.is_recurring}
            onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
          />
          Atividade fixa (repete toda semana)
        </label>
        {err && <p className="text-sm text-coral">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar atividade'}
        </button>
      </form>
    </Modal>
  )
}
