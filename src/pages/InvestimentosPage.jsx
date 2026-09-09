import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, Link2 } from 'lucide-react'
import { useInvestments } from '../hooks/useInvestments'
import { formatBRL, formatDateBR } from '../lib/format'
import CategoryBars from '../components/CategoryBars'
import PortfolioGrowthChart from '../components/PortfolioGrowthChart'
import AddInvestmentModal from '../components/AddInvestmentModal'

export default function InvestimentosPage() {
  const inv = useInvestments()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const names = useMemo(() => [...new Set(inv.items.map((i) => i.name))], [inv.items])

  const openNew = () => { setEditing(null); setModal(true) }
  const openEdit = (row) => { setEditing(row); setModal(true) }
  const close = () => { setModal(false); setEditing(null) }
  const submit = (payload) =>
    editing ? inv.updateInvestment(editing.id, payload) : inv.addInvestment(payload)

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Patrimônio</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Investimentos
          </h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> Novo investimento
        </button>
      </header>

      {inv.error && (
        <p className="rounded-xl bg-coral/10 px-4 py-2.5 text-sm text-coral">{inv.error}</p>
      )}

      {/* total */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-card">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <TrendingUp size={16} /> Total investido
        </div>
        <p className="mt-2 font-display text-3xl font-bold tnum">{formatBRL(inv.total)}</p>
        <p className="mt-1 text-xs opacity-80">
          {inv.items.length} aporte(s) · patrimônio acumulado
        </p>
      </section>

      {/* gráficos */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <h2 className="mb-1 font-display text-lg font-bold text-slate-900 dark:text-white">
            Alocação por tipo
          </h2>
          <p className="mb-4 text-xs text-slate-400">Quanto você tem em cada classe</p>
          <CategoryBars data={inv.byKind} total={inv.total} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <h2 className="mb-1 font-display text-lg font-bold text-slate-900 dark:text-white">
            Evolução do patrimônio
          </h2>
          <p className="mb-4 text-xs text-slate-400">Acumulado ao longo dos meses</p>
          <PortfolioGrowthChart data={inv.growth} />
        </div>
      </section>

      {/* tabela */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display font-bold text-slate-900 dark:text-white">Meus aportes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-ink-800">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3 text-right">Valor</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {inv.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Nenhum investimento ainda. Adicione o primeiro ou lance uma poupança nas Finanças.
                  </td>
                </tr>
              )}
              {inv.items.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 last:border-0 dark:border-ink-800/60">
                  <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      {i.name}
                      {i.source === 'savings' && (
                        <span
                          title="Veio da poupança lançada nas Finanças"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-600 dark:bg-brand-900/40"
                        >
                          <Link2 size={10} /> poupança
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                      {i.kind}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-500">{formatDateBR(i.invested_at)}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold tnum">{formatBRL(i.amount)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(i)}
                        className="rounded-md p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-ink-800"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (i.source === 'savings') {
                            alert('Este aporte veio da poupança. Edite ou exclua pela aba Finanças para manter tudo em sincronia.')
                            return
                          }
                          if (confirm(`Excluir "${i.name}"?`)) inv.removeInvestment(i.id)
                        }}
                        className="rounded-md p-1 text-slate-400 hover:bg-coral/10 hover:text-coral"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AddInvestmentModal
        open={modal}
        names={names}
        initial={editing}
        onClose={close}
        onSubmit={submit}
      />
    </div>
  )
}
