import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CalendarDays,
  Salad,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Navegação agrupada por módulo da vida.
const groups = [
  {
    label: null,
    items: [{ to: '/', label: 'Início', icon: Home, end: true }],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/financeiro', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/financeiro/financas', label: 'Finanças', icon: Wallet },
      { to: '/financeiro/investimentos', label: 'Investimentos', icon: TrendingUp },
    ],
  },
  {
    label: 'Vida',
    items: [
      { to: '/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/nutricao', label: 'Nutrição', icon: Salad },
    ],
  },
]

export default function AppLayout({ dark, onToggleTheme }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const SidebarInner = () => (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-card">
          <Home size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold text-slate-900 dark:text-white">My Life Pal</p>
          <p className="text-[11px] text-slate-400">seu painel de vida</p>
        </div>
      </Link>

      <nav className="mt-1 flex-1 space-y-4 overflow-y-auto px-3">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, end, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 dark:text-ink-700"
                    title="Em breve"
                  >
                    <Icon size={18} />
                    {label}
                    <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] uppercase text-slate-400 dark:bg-ink-800">
                      breve
                    </span>
                  </div>
                ) : (
                  <NavLink
                    key={label}
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-card'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-800'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-200 px-3 py-3 dark:border-ink-800">
        <p className="truncate px-2 text-xs text-slate-400" title={user?.email}>
          {user?.email}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onToggleTheme}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:border-ink-700 dark:hover:bg-ink-800"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {dark ? 'Claro' : 'Escuro'}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-coral/10 hover:text-coral dark:border-ink-700"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900 lg:block">
        <SidebarInner />
      </aside>

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
            <Home size={16} />
          </div>
          <span className="font-display font-bold text-slate-900 dark:text-white">My Life Pal</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-800"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl dark:bg-ink-900">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-ink-800"
            >
              <X size={20} />
            </button>
            <SidebarInner />
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
