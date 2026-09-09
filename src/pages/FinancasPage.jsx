import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useMonth } from '../context/MonthContext'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL, monthLabel } from '../lib/format'
import MonthNavigator from '../components/MonthNavigator'
import ExpensesTable from '../components/ExpensesTable'
import SimpleList from '../components/SimpleList'
import AddExpenseModal from '../components/AddExpenseModal'
import AddSimpleModal from '../components/AddSimpleModal'

export default function FinancasPage() {
  const { refMonth, setRefMonth, months, addNextMonth, reloadMonths } = useMonth()
  const { user } = useAuth()
  const fin = useFinanceData(refMonth)
  const [modal, setModal] = useState(null) // 'income' | 'saving' | 'expense' | null
  const [editing, setEditing] = useState(null) // registro em edição
  const [toast, setToast] = useState(null)
  const [bringing, setBringing] = useState(false)

  const { totals, suggestions } = fin

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleBringRecurring = async () => {
    setBringing(true)
    try {
      const { incomes, expenses } = await fin.bringRecurring()
      const total = incomes + expenses
      if (total > 0) reloadMonths()
      showToast(
        total === 0
          ? 'Nenhum item fixo novo para trazer.'
          : `Trazidos ${total} itens fixos (${incomes} receitas, ${expenses} despesas).`
      )
    } catch (e) {
      showToast(`Não deu para trazer os fixos: ${e.message}`)
    } finally {
      setBringing(false)
    }
  }

  // abre modal de edição para a linha clicada
  const editIncome = (row) => { setEditing(row); setModal('income') }
  const editSaving = (row) => { setEditing(row); setModal('saving') }
  const editExpense = (row) => { setEditing(row); setModal('expense') }
  const closeModal = () => { setModal(null); setEditing(null) }

  // submit unificado: cria (sem editing) ou atualiza (com editing)
  // após criar, recarrega a lista de meses do banco (novo mês passa a existir de verdade)
  const submitIncome = async (payload) => {
    if (editing) return fin.updateRow('incomes', editing.id, payload)
    await fin.addIncome(payload)
    reloadMonths()
  }
  const submitSaving = async (payload) => {
    if (editing) return fin.updateRow('savings', editing.id, payload)
    await fin.addSaving(payload)
    reloadMonths()
  }
  const submitExpense = async (payload) => {
    if (editing) return fin.updateRow('expenses', editing.id, payload)
    await fin.addExpense(payload)
    reloadMonths()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Lançamentos</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {monthLabel(refMonth)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBringRecurring}
            disabled={bringing}
            title="Copiar os itens fixos do mês anterior"
            className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
          >
            <RefreshCw size={15} className={bringing ? 'animate-spin' : ''} /> Trazer fixos
          </button>
          <MonthNavigator months={months} value={refMonth} onChange={setRefMonth} onAddNext={addNextMonth} />
        </div>
      </header>

      {fin.error && (
        <p className="rounded-xl bg-coral/10 px-4 py-2.5 text-sm text-coral">{fin.error}</p>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: 'Receita', v: totals.totalIncome, c: 'text-money' },
          { l: 'Despesas', v: totals.totalExpenses, c: 'text-coral' },
          { l: 'Poupança', v: totals.totalSavings, c: 'text-brand-500' },
          { l: 'Saldo', v: totals.cashBalance, c: totals.cashBalance >= 0 ? 'text-money' : 'text-coral' },
        ].map((k) => (
          <div
            key={k.l}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{k.l}</p>
            <p className={`mt-1.5 font-display text-lg font-bold tnum ${k.c}`}>{formatBRL(k.v)}</p>
          </div>
        ))}
      </section>

      {/* progresso de pagamento do mês */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            Pago <span className="tnum font-semibold">{formatBRL(totals.paid)}</span> de{' '}
            <span className="tnum">{formatBRL(totals.totalExpenses)}</span>
          </span>
          <span className="text-slate-400">{totals.paidPct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-money transition-all"
            style={{ width: `${totals.paidPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Restante a pagar: <span className="tnum">{formatBRL(totals.remaining)}</span>
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 dark:text-white">Receitas</h2>
            <button
              onClick={() => { setEditing(null); setModal('income') }}
              className="flex items-center gap-1 rounded-lg bg-money/10 px-2.5 py-1.5 text-sm font-medium text-money hover:bg-money/20"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
          <SimpleList
            rows={fin.incomes}
            labelField="description"
            table="incomes"
            onDelete={fin.removeRow}
            onEdit={editIncome}
            emptyText="Nenhuma receita ainda. Adicione a primeira."
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 dark:text-white">Poupança</h2>
            <button
              onClick={() => { setEditing(null); setModal('saving') }}
              className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
          <SimpleList
            rows={fin.savings}
            labelField="kind"
            table="savings"
            onDelete={fin.removeRow}
            onEdit={editSaving}
            emptyText="Nenhuma poupança ainda."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 dark:text-white">Despesas do mês</h2>
          <button
            onClick={() => { setEditing(null); setModal('expense') }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus size={15} /> Nova despesa
          </button>
        </div>
        <ExpensesTable
          expenses={fin.expenses}
          currentUserId={user?.id}
          onTogglePaid={fin.toggleExpensePaid}
          onDelete={fin.removeRow}
          onEdit={editExpense}
          onInlineSave={(id, patch) => fin.updateRow('expenses', id, patch)}
          onBulkUpdate={fin.bulkUpdate}
          onBulkDelete={fin.bulkDelete}
        />
      </section>

      {/* modais */}
      <AddSimpleModal
        open={modal === 'income'}
        title="Nova receita"
        label="Fonte (ex: Salário)"
        field="description"
        options={suggestions.incomeSources}
        showRecurring
        initial={modal === 'income' ? editing : null}
        onClose={closeModal}
        onSubmit={submitIncome}
      />
      <AddSimpleModal
        open={modal === 'saving'}
        title="Nova poupança"
        label="Tipo (ex: Reserva)"
        field="kind"
        options={suggestions.savingKinds}
        initial={modal === 'saving' ? editing : null}
        onClose={closeModal}
        onSubmit={submitSaving}
      />
      <AddExpenseModal
        open={modal === 'expense'}
        items={suggestions.expenseItems}
        initial={modal === 'expense' ? editing : null}
        refMonth={refMonth}
        currentUserId={user?.id}
        currentUserEmail={user?.email}
        onClose={closeModal}
        onSubmit={submitExpense}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-ink-700">
          {toast}
        </div>
      )}
    </div>
  )
}
