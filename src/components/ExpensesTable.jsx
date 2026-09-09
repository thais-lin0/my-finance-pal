import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Trash2,
  Pencil,
  Search,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { EXPENSE_CATEGORIES, formatBRL, formatDateBR, dueStatus } from '../lib/format'
import { expenseShare } from '../hooks/useFinanceData'
import EditableCell from './EditableCell'

const dueClasses = {
  overdue: 'text-coral font-semibold',
  soon: 'text-amber font-medium',
  ok: 'text-slate-500',
  none: 'text-slate-400',
}

export default function ExpensesTable({
  expenses,
  currentUserId,
  onTogglePaid,
  onDelete,
  onEdit,
  onInlineSave,
  onBulkUpdate,
  onBulkDelete,
}) {
  const [catFilter, setCatFilter] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState('todos') // todos | pago | pendente
  const [dueFilter, setDueFilter] = useState('todos') // todos | overdue | soon
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'due_date', dir: 'asc' })
  const [selected, setSelected] = useState(() => new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rows = useMemo(() => {
    let out = expenses.filter((e) => {
      const okCat = catFilter === 'Todas' || e.category === catFilter
      const okStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'pago' && e.is_paid) ||
        (statusFilter === 'pendente' && !e.is_paid)
      const st = dueStatus(e.due_date, e.is_paid)
      const okDue =
        dueFilter === 'todos' ||
        (dueFilter === 'overdue' && st === 'overdue') ||
        (dueFilter === 'soon' && st === 'soon')
      const okQuery =
        !query.trim() || e.description.toLowerCase().includes(query.trim().toLowerCase())
      return okCat && okStatus && okDue && okQuery
    })

    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      if (key === 'amount') return (Number(a.amount) - Number(b.amount)) * mul
      if (key === 'description') return a.description.localeCompare(b.description) * mul
      if (key === 'category') return a.category.localeCompare(b.category) * mul
      // due_date (nulls por último)
      const av = a.due_date || '9999-12-31'
      const bv = b.due_date || '9999-12-31'
      return av.localeCompare(bv) * mul
    })
    return out
  }, [expenses, catFilter, statusFilter, dueFilter, query, sort])

  const summary = useMemo(() => {
    const total = rows.reduce((s, e) => s + expenseShare(e, currentUserId), 0)
    const pending = rows.filter((e) => !e.is_paid).length
    return { count: rows.length, total, pending }
  }, [rows, currentUserId])

  // paginação
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize]
  )
  const from = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, rows.length)

  // volta para a página 1 quando filtros/busca/ordenação/tamanho mudam
  useEffect(() => {
    setPage(1)
  }, [catFilter, statusFilter, dueFilter, query, sort, pageSize])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const allVisibleSelected = rows.length > 0 && rows.every((e) => selected.has(e.id))
  const toggleSelectAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(rows.map((e) => e.id)))
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const clearSelection = () => setSelected(new Set())
  const selectedIds = [...selected]

  const runBulk = async (fn) => {
    await fn(selectedIds)
    clearSelection()
  }

  return (
    <div>
      {/* filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar item…"
            className="w-44 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-ink-700 dark:bg-ink-800"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-800"
        >
          <option>Todas</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-800"
        >
          <option value="todos">Todos os status</option>
          <option value="pago">Pagos</option>
          <option value="pendente">Pendentes</option>
        </select>
        <select
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-800"
        >
          <option value="todos">Qualquer vencimento</option>
          <option value="overdue">Vencidas</option>
          <option value="soon">Vencem em breve</option>
        </select>
      </div>

      {/* barra de ações em lote */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm dark:bg-brand-900/30">
          <span className="font-medium text-brand-700 dark:text-brand-300">
            {selectedIds.length} selecionada(s)
          </span>
          <button
            onClick={() => runBulk((ids) => onBulkUpdate(ids, { is_paid: true }))}
            className="rounded-lg bg-money/10 px-2.5 py-1 font-medium text-money hover:bg-money/20"
          >
            Marcar pago
          </button>
          <button
            onClick={() => runBulk((ids) => onBulkUpdate(ids, { is_paid: false }))}
            className="rounded-lg bg-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-300 dark:bg-ink-700 dark:text-slate-300"
          >
            Marcar pendente
          </button>
          <select
            onChange={(e) => {
              if (e.target.value) runBulk((ids) => onBulkUpdate(ids, { category: e.target.value }))
              e.target.value = ''
            }}
            defaultValue=""
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-ink-700 dark:bg-ink-800"
          >
            <option value="" disabled>
              Mudar categoria…
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (confirm(`Excluir ${selectedIds.length} despesa(s)?`))
                runBulk((ids) => onBulkDelete(ids))
            }}
            className="rounded-lg bg-coral/10 px-2.5 py-1 font-medium text-coral hover:bg-coral/20"
          >
            Excluir
          </button>
          <button onClick={clearSelection} className="text-slate-400 hover:text-slate-600">
            limpar
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-ink-800">
              <th className="w-8 py-2">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
              </th>
              <th className="cursor-pointer py-2 pr-3 select-none" onClick={() => toggleSort('description')}>
                <span className="inline-flex items-center gap-1">Item <ArrowUpDown size={11} /></span>
              </th>
              <th className="cursor-pointer py-2 pr-3 select-none" onClick={() => toggleSort('category')}>
                <span className="inline-flex items-center gap-1">Tipo <ArrowUpDown size={11} /></span>
              </th>
              <th className="cursor-pointer py-2 pr-3 select-none" onClick={() => toggleSort('due_date')}>
                <span className="inline-flex items-center gap-1">Vencimento <ArrowUpDown size={11} /></span>
              </th>
              <th className="cursor-pointer py-2 pr-3 text-right select-none" onClick={() => toggleSort('amount')}>
                <span className="inline-flex items-center gap-1">Valor <ArrowUpDown size={11} /></span>
              </th>
              <th className="py-2 pr-3 text-center">Pago</th>
              <th className="py-2 pr-3">Obs</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  Nenhuma despesa encontrada.
                </td>
              </tr>
            )}
            {pagedRows.map((e) => {
              const st = dueStatus(e.due_date, e.is_paid)
              return (
                <tr
                  key={e.id}
                  className="border-b border-slate-100 last:border-0 dark:border-ink-800/60"
                >
                  <td className="py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggleSelect(e.id)}
                    />
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      <EditableCell
                        value={e.description}
                        onSave={(v) => onInlineSave(e.id, { description: String(v).trim() })}
                      />
                      {e.is_recurring && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-600 dark:bg-brand-900/40">
                          fixo
                        </span>
                      )}
                      {e.shared_with && (
                        <span
                          title={e.user_id === currentUserId ? 'Você dividiu esta despesa' : 'Dividida com você'}
                          className="rounded-full bg-money/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-money"
                        >
                          dividida {e.owner_share ?? 50}/{100 - (e.owner_share ?? 50)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <EditableCell
                      type="select"
                      value={e.category}
                      options={EXPENSE_CATEGORIES}
                      onSave={(v) => onInlineSave(e.id, { category: v })}
                      display={
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                          {e.category}
                        </span>
                      }
                    />
                  </td>
                  <td className={`py-2.5 pr-3 ${dueClasses[st]}`}>
                    <EditableCell
                      type="date"
                      value={e.due_date || ''}
                      onSave={(v) => onInlineSave(e.id, { due_date: v || null })}
                      display={
                        <span className="inline-flex items-center gap-1">
                          {st === 'overdue' && <AlertTriangle size={13} />}
                          {st === 'soon' && <Clock size={13} />}
                          {formatDateBR(e.due_date)}
                        </span>
                      }
                    />
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold tnum">
                    <EditableCell
                      type="number"
                      align="right"
                      value={e.amount}
                      onSave={(v) => onInlineSave(e.id, { amount: v })}
                      display={
                        e.shared_with ? (
                          <span title={`Total ${formatBRL(e.amount)} · sua parte`}>
                            {formatBRL(expenseShare(e, currentUserId))}
                            <span className="ml-1 text-[10px] font-normal text-slate-400">de {formatBRL(e.amount)}</span>
                          </span>
                        ) : (
                          formatBRL(e.amount)
                        )
                      }
                    />
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    <button
                      onClick={() => onTogglePaid(e.id, !e.is_paid)}
                      title={e.is_paid ? 'Marcar como pendente' : 'Marcar como pago'}
                      className={`inline-grid h-6 w-6 place-items-center rounded-md border transition ${
                        e.is_paid
                          ? 'border-money bg-money text-white'
                          : 'border-slate-300 text-transparent hover:border-money dark:border-ink-700'
                      }`}
                    >
                      <Check size={14} />
                    </button>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-400">
                    <EditableCell
                      value={e.notes || ''}
                      onSave={(v) => onInlineSave(e.id, { notes: String(v).trim() || null })}
                      display={e.notes || '—'}
                    />
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(e)}
                        className="rounded-md p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-ink-800"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${e.description}"?`)) onDelete('expenses', e.id)
                        }}
                        className="rounded-md p-1 text-slate-400 hover:bg-coral/10 hover:text-coral"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* resumo + paginação */}
      {rows.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Mostrando {from}–{to} de {summary.count} · <span className="tnum">{formatBRL(summary.total)}</span>{' '}
            · {summary.pending} pendente(s)
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              Por página
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-ink-700 dark:bg-ink-800"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-ink-700 dark:hover:bg-ink-800"
                title="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[72px] text-center text-xs text-slate-500 dark:text-slate-400">
                {currentPage} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-ink-700 dark:hover:bg-ink-800"
                title="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
