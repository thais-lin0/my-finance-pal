import { Link } from 'react-router-dom'
import { Wallet, CalendarDays, Salad, ArrowRight } from 'lucide-react'

const modules = [
  {
    to: '/financeiro',
    title: 'Financeiro',
    desc: 'Receitas, despesas, investimentos e o balanço do mês.',
    icon: Wallet,
    tint: 'from-brand-500 to-brand-700',
    available: true,
  },
  {
    to: '/agenda',
    title: 'Agenda',
    desc: 'Planejamento semanal de treinos, academia e atividades.',
    icon: CalendarDays,
    tint: 'from-money to-emerald-600',
    available: true,
  },
  {
    to: '#',
    title: 'Nutrição',
    desc: 'Refeições, metas e acompanhamento alimentar.',
    icon: Salad,
    tint: 'from-amber to-orange-500',
    available: false,
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Seu painel de vida</p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">My Life Pal</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Escolha um módulo para organizar essa parte da sua vida.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ to, title, desc, icon: Icon, tint, available }) => {
          const inner = (
            <div
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition dark:border-ink-800 dark:bg-ink-900 ${
                available ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-70'
              }`}
            >
              <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tint} text-white`}>
                <Icon size={22} />
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium">
                {available ? (
                  <span className="flex items-center gap-1 text-brand-600 dark:text-brand-300">
                    Abrir <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400 dark:bg-ink-800">
                    Em breve
                  </span>
                )}
              </div>
            </div>
          )
          return available ? (
            <Link key={title} to={to}>
              {inner}
            </Link>
          ) : (
            <div key={title}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
