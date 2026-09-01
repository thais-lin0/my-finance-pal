import { useEffect, useState } from 'react'
import Modal from './Modal'
import ComboInput from './ComboInput'
import { EXPENSE_CATEGORIES, defaultDueDate } from '../lib/format'

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

const empty = {
  description: '',
  category: 'Casa',
  amount: '',
  due_date: '',
  notes: '',
  is_paid: false,
  is_recurring: false,
}

// `items`: sugestões de despesas anteriores [{description, category, amount}]
// `initial`: despesa em edição (ou null)
// `refMonth`: mês de referência, usado para o vencimento padrão (dia 7)
export default function AddExpenseModal({ open, onClose, onSubmit, items = [], initial = null, refMonth }) {
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const editing = Boolean(initial)

  useEffect(() => {
    if (open && initial) {
      setForm({
        description: initial.description ?? '',
        category: initial.category ?? 'Casa',
        amount: String(initial.amount ?? ''),
        due_date: initial.due_date ?? '',
        notes: initial.notes ?? '',
        is_paid: Boolean(initial.is_paid),
        is_recurring: Boolean(initial.is_recurring),
      })
    }
    if (open && !initial) setForm({ ...empty, due_date: defaultDueDate(refMonth) })
  }, [open, initial, refMonth])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // ao escolher/digitar uma descrição já conhecida, pré-preenche categoria e valor
  const onDescription = (val) => {
    setForm((f) => {
      const match = items.find(
        (i) => i.description.trim().toLowerCase() === val.trim().toLowerCase()
      )
      if (match && !editing) {
        return { ...f, description: val, category: match.category, amount: String(match.amount) }
      }
      return { ...f, description: val }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await onSubmit({
        description: form.description.trim(),
        category: form.category,
        amount: Number(form.amount) || 0,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
        is_paid: form.is_paid,
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
    <Modal open={open} title={editing ? 'Editar despesa' : 'Nova despesa'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ComboInput
          value={form.description}
          onChange={onDescription}
          options={items.map((i) => i.description)}
          placeholder="Item (ex: Cartão Black)"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputCls} value={form.category} onChange={set('category')}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="Valor"
            required
            value={form.amount}
            onChange={set('amount')}
          />
        </div>
        <input className={inputCls} type="date" value={form.due_date} onChange={set('due_date')} />
        <input
          className={inputCls}
          placeholder="Observação (opcional)"
          value={form.notes}
          onChange={set('notes')}
        />
        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.checked }))}
            />
            Já pago
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
            />
            Fixo (todo mês)
          </label>
        </div>

        {err && <p className="text-sm text-coral">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar despesa'}
        </button>
      </form>
    </Modal>
  )
}
