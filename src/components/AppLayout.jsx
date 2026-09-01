import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/investimentos', label: 'Investimentos', icon: TrendingUp },
]

export default function AppLayout({ dark, onToggleTheme }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const SidebarInner = () => (
    <div className="flex h-full flex-col">
      {/* marca */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-card">
          <Wallet size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold text-slate-900 dark:text-white">
            Finance Pal
          </p>
          <p className="text-[11px] text-slate-400">controle pessoal</p>
        </div>
      </div>

      {/* navegação */}
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
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
        ))}
      </nav>

      {/* rodapé: usuário, tema, sair */}
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
      {/* sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900 lg:block">
        <SidebarInner />
      </aside>

      {/* topbar mobile */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
            <Wallet size={16} />
          </div>
          <span className="font-display font-bold text-slate-900 dark:text-white">
            Finance Pal
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-800"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* drawer mobile */}
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

      {/* conteúdo */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
