// Formatação em Real brasileiro e utilitários de data/mês.

export function formatBRL(value) {
  const n = Number(value) || 0
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

export function formatDateBR(value) {
  if (!value) return '—'
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

// Retorna o primeiro dia do mês (YYYY-MM-01) para uma data qualquer.
export function monthKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

// "2026-10-01" -> "Outubro 2026"
export function monthLabel(key) {
  if (!key) return ''
  const d = new Date(key + 'T00:00:00')
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Lista os últimos N meses (chaves YYYY-MM-01), do mais recente ao mais antigo.
export function recentMonths(count = 12, from = new Date()) {
  const out = []
  const base = new Date(from.getFullYear(), from.getMonth(), 1)
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    out.push(monthKey(d))
  }
  return out
}

// Retorna a chave do mês anterior a uma chave YYYY-MM-01.
export function prevMonthKey(key) {
  const d = new Date(key + 'T00:00:00')
  return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

// Retorna a chave do mês seguinte a uma chave YYYY-MM-01.
export function nextMonthKey(key) {
  const d = new Date(key + 'T00:00:00')
  return monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

// Mês inicial do app: nada antes disto.
export const START_MONTH = '2026-09-01'

// Lista os meses de START_MONTH até `until` (inclusive), em ordem crescente.
// Garante pelo menos até o mês atual, ou mais adiante se `until` for maior.
export function monthsFromStart(until = monthKey()) {
  const start = new Date(START_MONTH + 'T00:00:00')
  const end = new Date((until > monthKey() ? until : monthKey()) + 'T00:00:00')
  const out = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    out.push(monthKey(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

// Dia de vencimento padrão das despesas: você recebe no 5º dia útil e paga
// tudo até o dia 7, então o vencimento default é o dia 7 do mês de referência.
export const DEFAULT_DUE_DAY = 7

export function defaultDueDate(refMonth) {
  if (!refMonth) return ''
  return refMonth.slice(0, 8) + String(DEFAULT_DUE_DAY).padStart(2, '0') // YYYY-MM-07
}

// Status de vencimento de uma despesa (para destaque visual e filtro).
// Retorna 'overdue' | 'soon' | 'ok' | 'none'.
export function dueStatus(dueDate, isPaid, today = new Date()) {
  if (isPaid) return 'ok'
  if (!dueDate) return 'none'
  const d = new Date(dueDate + 'T00:00:00')
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.round((d - t) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 5) return 'soon'
  return 'ok'
}

export const EXPENSE_CATEGORIES = [
  'Carro',
  'Cartão de crédito',
  'Casa',
  'Educação',
  'Impostos',
  'Saúde',
  'Lazer',
  'Outros',
]
