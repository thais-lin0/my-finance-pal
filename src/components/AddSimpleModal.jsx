import { useEffect, useState } from 'react'
import Modal from './Modal'
import ComboInput from './ComboInput'

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

// Modal para receita (field="description") ou poupança (field="kind").
// `options`: sugestões para o dropdown. `initial`: registro em edição (ou null).
export default function AddSimpleModal({
  open,
  title,
  label,
  field,
  options = [],
  onClose,
  onSubmit,
  showRecurring = false,
  initial = null,
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const editing = Boolean(initial)

  // preenche o formulário ao abrir em modo edição
  useEffect(() => {
    if (open && initial) {
      setName(initial[field] ?? '')
      setAmount(String(initial.amount ?? ''))
      setRecurring(Boolean(initial.is_recurring))
    }
    if (open && !initial) {
      setName('')
      setAmount('')
      setRecurring(false)
    }
  }, [open, initial, field])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const payload = { [field]: name.trim(), amount: Number(amount) || 0 }
      if (showRecurring) payload.is_recurring = recurring
      await onSubmit(payload)
      onClose()
    } catch (e2) {
      setErr(e2.message ?? 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={editing ? `Editar ${title.toLowerCase()}` : title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ComboInput
          value={name}
          onChange={setName}
          options={options}
          placeholder={label}
          required
        />
        <input
          className={inputCls}
          type="number"
          step="0.01"
          placeholder="Valor"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {showRecurring && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Item fixo (repete todo mês)
          </label>
        )}
        {err && <p className="text-sm text-coral">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar'}
        </button>
      </form>
    </Modal>
  )
}
