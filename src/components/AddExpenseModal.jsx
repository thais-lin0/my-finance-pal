import { useEffect, useState } from 'react'
import Modal from './Modal'
import ComboInput from './ComboInput'
import { EXPENSE_CATEGORIES, defaultDueDate } from '../lib/format'
import { supabase } from '../lib/supabase'

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
  shareOn: false,
  shareEmail: '',
  ownerShare: 50,
}

// `items`: sugestões de despesas anteriores [{description, category, amount}]
// `initial`: despesa em edição (ou null)
// `refMonth`: mês de referência (vencimento padrão dia 7)
// `sharedEmailById`: mapa uuid->email para exibir com quem já está dividida (opcional)
export default function AddExpenseModal({ open, onClose, onSubmit, items = [], initial = null, refMonth, currentUserId, currentUserEmail }) {
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const editing = Boolean(initial)
  // ao editar uma despesa compartilhada, só o dono pode mexer no rateio
  const canEditShare = !editing || initial?.user_id === currentUserId

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
        shareOn: Boolean(initial.shared_with),
        shareEmail: initial.shared_with_email ?? '',
        ownerShare: initial.owner_share ?? 50,
      })
    }
    if (open && !initial) setForm({ ...empty, due_date: defaultDueDate(refMonth) })
  }, [open, initial, refMonth])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onDescription = (val) => {
    setForm((f) => {
      const match = items.find((i) => i.description.trim().toLowerCase() === val.trim().toLowerCase())
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
      const payload = {
        description: form.description.trim(),
        category: form.category,
        amount: Number(form.amount) || 0,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
        is_paid: form.is_paid,
        is_recurring: form.is_recurring,
      }

      // rateio: só o dono define/edita
      if (canEditShare) {
        if (form.shareOn && form.shareEmail.trim()) {
          const email = form.shareEmail.trim()
          if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
            throw new Error('Você não pode dividir a despesa com você mesma.')
          }
          const { data: uid, error: rpcErr } = await supabase.rpc('find_user_id_by_email', { p_email: email })
          if (rpcErr) throw rpcErr
          if (!uid) throw new Error(`Nenhum usuário do My Life Pal com o email "${email}". Peça para a pessoa criar a conta primeiro.`)
          payload.shared_with = uid
          payload.owner_share = Math.max(0, Math.min(100, Number(form.ownerShare) || 50))
        } else {
          payload.shared_with = null
          payload.owner_share = 50
        }
      }

      await onSubmit(payload)
      onClose()
    } catch (e2) {
      setErr(e2.message ?? 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  const otherShare = 100 - (Number(form.ownerShare) || 0)

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
          <input className={inputCls} type="number" step="0.01" placeholder="Valor" required value={form.amount} onChange={set('amount')} />
        </div>
        <input className={inputCls} type="date" value={form.due_date} onChange={set('due_date')} />
        <input className={inputCls} placeholder="Observação (opcional)" value={form.notes} onChange={set('notes')} />

        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.checked }))} />
            Já pago
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} />
            Fixo (todo mês)
          </label>
        </div>

        {/* dividir despesa */}
        {canEditShare ? (
          <div className="rounded-xl border border-slate-200 p-3 dark:border-ink-700">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.shareOn} onChange={(e) => setForm((f) => ({ ...f, shareOn: e.target.checked }))} />
              Dividir com outra pessoa
            </label>
            {form.shareOn && (
              <div className="mt-3 space-y-2">
                <input
                  className={inputCls}
                  type="email"
                  placeholder="email da pessoa (precisa ter conta)"
                  value={form.shareEmail}
                  onChange={set('shareEmail')}
                />
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span>Minha parte</span>
                  <input
                    className={`${inputCls} w-20`}
                    type="number"
                    min="0"
                    max="100"
                    value={form.ownerShare}
                    onChange={set('ownerShare')}
                  />
                  <span>% · a pessoa fica com {otherShare}%</span>
                </div>
                {Number(form.amount) > 0 && (
                  <p className="text-xs text-slate-400">
                    Você conta {((Number(form.amount) * (Number(form.ownerShare) || 0)) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })},
                    a pessoa {((Number(form.amount) * otherShare) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            Despesa dividida (criada por outra pessoa). Você pode editar os campos; o rateio é controlado por quem criou.
          </p>
        )}

        {err && <p className="text-sm text-coral">{err}</p>}

        <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
          {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar despesa'}
        </button>
      </form>
    </Modal>
  )
}
