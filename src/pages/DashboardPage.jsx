import { ArrowUpRight, PiggyBank } from 'lucide-react'
import { useMonth } from '../context/MonthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { useMonthComparison } from '../hooks/useMonthComparison'
import { formatBRL, monthLabel, prevMonthKey } from '../lib/format'
import MonthNavigator from '../components/MonthNavigator'
import MonthCompareChart from '../components/MonthCompareChart'
import DeltaCard from '../components/DeltaCard'
import CategoryBars from '../components/CategoryBars'
import CategoryShareBar from '../components/CategoryShareBar'

export default function DashboardPage() {
  const { refMonth, setRefMonth, months, addNextMonth } = useMonth()
  const fin = useFinanceData(refMonth)
  const cmp = useMonthComparison(refMonth)
  const { totals } = fin

  const curLabel = monthLabel(refMonth)
  const prevLabel = monthLabel(prevMonthKey(refMonth))

  // dados do gráfico de %: gastos por categoria + Poupança (quando houver),
  // já que a poupança também é dinheiro que saiu do caixa no mês.
  const shareData = totals.totalSavings > 0
    ? [...fin.byCategory, { name: 'Poupança', value: totals.totalSavings }].sort(
        (a, b) => b.value - a.value
      )
    : fin.byCategory
  const shareTotal = totals.totalExpenses + totals.totalSavings

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 lg:px-8">
      {/* cabeçalho */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-500">
            Visão do mês
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {curLabel}
          </h1>
        </div>
        <MonthNavigator months={months} value={refMonth} onChange={setRefMonth} onAddNext={addNextMonth} />
      </header>

      {/* deltas de totais vs mês anterior */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DeltaCard
          label="Receita"
          value={totals.totalIncome}
          delta={cmp.deltas.income}
          goodWhenUp
          accent="bg-money"
        />
        <DeltaCard
          label="Despesas"
          value={totals.totalExpenses}
          delta={cmp.deltas.expense}
          goodWhenUp={false}
          accent="bg-coral"
        />
        <DeltaCard
          label="Saldo em caixa"
          value={totals.cashBalance}
          delta={cmp.deltas.balance}
          goodWhenUp
          accent="bg-brand-500"
        />
      </section>

      {/* signature: comparativo mês vs mês por categoria */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Onde você gastou mais
            </h2>
            <p className="text-xs text-slate-400">
              {curLabel} comparado com {prevLabel}, por categoria
            </p>
          </div>
          <span className="hidden items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-300 sm:flex">
            <ArrowUpRight size={13} /> mês a mês
          </span>
        </div>
        <MonthCompareChart data={cmp.byCategory} currentLabel={curLabel} prevLabel={prevLabel} />
        {cmp.topMover && cmp.topMover.diff !== 0 && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-ink-800 dark:text-slate-400">
            {cmp.topMover.diff > 0 ? (
              <>
                Maior aumento: <strong className="text-coral">{cmp.topMover.name}</strong>{' '}
                <span className="tnum">+{formatBRL(cmp.topMover.diff)}</span> vs {prevLabel}.
              </>
            ) : (
              <>
                Maior economia: <strong className="text-money">{cmp.topMover.name}</strong>{' '}
                <span className="tnum">{formatBRL(cmp.topMover.diff)}</span> vs {prevLabel}.
              </>
            )}
          </p>
        )}
      </section>

      {/* proporção de gastos por categoria */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-1 font-display text-lg font-bold text-slate-900 dark:text-white">
          % de gasto por categoria
        </h2>
        <p className="mb-4 text-xs text-slate-400">Quanto cada categoria representa do total do mês</p>
        <CategoryShareBar data={shareData} total={shareTotal} />
      </section>

      {/* secundário: composição + poupança */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <h2 className="mb-1 font-display text-lg font-bold text-slate-900 dark:text-white">
            Composição dos gastos
          </h2>
          <p className="mb-4 text-xs text-slate-400">Por categoria, do maior para o menor</p>
          <CategoryBars data={fin.byCategory} total={totals.totalExpenses} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Poupança do mês
            </span>
            <PiggyBank size={18} className="text-brand-500" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-slate-900 tnum dark:text-white">
            {formatBRL(totals.totalSavings)}
          </p>
        </div>
      </section>
    </div>
  )
}
