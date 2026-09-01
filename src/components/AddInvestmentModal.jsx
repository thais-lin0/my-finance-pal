import { useEffect, useState } from 'react'
import Modal from './Modal'
import ComboInput from './ComboInput'
import { INVESTMENT_KINDS } from '../hooks/useInvestments'
import { monthKey } from '../lib/format'

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

const today = () => new Date().toISOString().slice(0, 10)

export default function AddInvestmentModal({ open, onClose, onSubmit, names = [], initial = null }) {
  const [form, setForm] = useState({ name: '', kind: 'CDB', amount: '', invested_at: today() })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const editing = Boolean(initial)

  useEffect(() => {
    if (open && initial) {
      setForm({
        name: initial.name ?? '',
        kind: initial.kind ?? 'CDB',
        amount: String(initial.amount ?? ''),
        invested_at: initial.invested_at ?? today(),
      })
    }
    if (open && !initial) setForm({ name: '', kind: 'CDB', amount: '', invested_at: today() })
  }, [open, initial])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await onSubmit({
        name: form.name.trim(),
        kind: form.kind,
        amount: Number(form.amount) || 0,
        invested_at: form.invested_at || today(),
      })
      onClose()
    } catch (e2) {
      setErr(e2.message ?? 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={editing ? 'Editar investimento' : 'Novo investimento'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ComboInput
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          options={names}
          placeholder="Nome (ex: CDB Banco Inter)"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputCls} value={form.kind} onChange={set('kind')}>
            {INVESTMENT_KINDS.map((k) => (
              <option key={k}>{k}</option>
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
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          Data do aporte
          <input className={`${inputCls} mt-1`} type="date" value={form.invested_at} onChange={set('invested_at')} />
        </label>
        {err && <p className="text-sm text-coral">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar aporte'}
        </button>
      </form>
    </Modal>
  )
}
