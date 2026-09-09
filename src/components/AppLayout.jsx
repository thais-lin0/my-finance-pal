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
  PanelLeftClose,
  PanelLeftOpen,
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
  const [open, setOpen] = useState(false) // drawer mobile
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mlp.sidebar') === 'collapsed')

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('mlp.sidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }

  // `mini`: renderiza só ícones (sidebar recolhida no desktop).
  const SidebarInner = ({ mini = false }) => (
    <div className="flex h-full flex-col">
      {/* marca + toggle */}
      <div className={`flex items-center py-5 ${mini ? 'justify-center px-2' : 'gap-2.5 px-5'}`}>
        <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5" title="My Life Pal">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white shadow-card">
            <Home size={18} />
          </div>
          {!mini && (
            <div className="leading-tight">
              <p className="font-display text-[15px] font-bold text-slate-900 dark:text-white">My Life Pal</p>
              <p className="text-[11px] text-slate-400">seu painel de vida</p>
            </div>
          )}
        </Link>
        {!mini && (
          <button
            onClick={toggleCollapsed}
            className="ml-auto hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-ink-800 lg:block"
            title="Recolher menu"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* botão expandir quando recolhida */}
      {mini && (
        <button
          onClick={toggleCollapsed}
          className="mx-auto mb-2 hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-ink-800 lg:block"
          title="Expandir menu"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <nav className={`mt-1 flex-1 space-y-4 overflow-y-auto ${mini ? 'px-2' : 'px-3'}`}>
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !mini && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            {group.label && mini && gi > 0 && <div className="mx-2 mb-2 border-t border-slate-200 dark:border-ink-800" />}
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, end, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    className={`flex items-center rounded-xl text-sm font-medium text-slate-300 dark:text-ink-700 ${
                      mini ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                    }`}
                    title={mini ? `${label} · Em breve` : 'Em breve'}
                  >
                    <Icon size={18} />
                    {!mini && (
                      <>
                        {label}
                        <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] uppercase text-slate-400 dark:bg-ink-800">
                          breve
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <NavLink
                    key={label}
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    title={mini ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl text-sm font-medium transition ${
                        mini ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-card'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-800'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {!mini && label}
                  </NavLink>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className={`space-y-2 border-t border-slate-200 py-3 dark:border-ink-800 ${mini ? 'px-2' : 'px-3'}`}>
        {!mini && (
          <p className="truncate px-2 text-xs text-slate-400" title={user?.email}>
            {user?.email}
          </p>
        )}
        <div className={`flex gap-2 ${mini ? 'flex-col' : ''}`}>
          <button
            onClick={onToggleTheme}
            className={`flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:border-ink-700 dark:hover:bg-ink-800 ${
              mini ? '' : 'flex-1'
            }`}
            title={dark ? 'Tema claro' : 'Tema escuro'}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {!mini && (dark ? 'Claro' : 'Escuro')}
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
      {/* sidebar desktop (largura alterna entre 64 e 256px) */}
      <aside
        className={`hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-ink-800 dark:bg-ink-900 lg:block ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarInner mini={collapsed} />
      </aside>

      {/* topbar mobile */}
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

      {/* drawer mobile (sempre expandido) */}
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
            <SidebarInner mini={false} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
