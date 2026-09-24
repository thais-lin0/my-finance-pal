import { ChevronRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────
//  NextSteps — cartão reutilizável de "próximos passos" / primeiros passos.
//  Cada tela alimenta uma lista de ações (ícone, título, descrição, ação),
//  resolvendo o "e agora?" depois de um onboarding ou numa tela vazia.
//
//  props:
//    title      — cabeçalho do bloco (ex: "Próximos passos")
//    subtitle   — linha de apoio opcional
//    steps      — [{ icon, title, description, cta, onClick, done, tone, busy }]
//        icon        componente lucide (obrigatório)
//        title       string
//        description string curta
//        cta         texto do botão (ex: "Gerar agora")
//        onClick     handler
//        done        se true, vira estado concluído (check + esmaecido)
//        busy        se true, desabilita e mostra "…"
//        tone        'brand' (padrão) | 'money' — cor de destaque do card
// ─────────────────────────────────────────────────────────────────────

const toneMap = {
  brand: {
    ring: 'hover:border-brand-400',
    iconWrap: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
    cta: 'text-brand-600 dark:text-brand-300',
  },
  money: {
    ring: 'hover:border-money/50',
    iconWrap: 'bg-money/10 text-money',
    cta: 'text-money',
  },
}

export default function NextSteps({ title = 'Próximos passos', subtitle, steps = [] }) {
  const visible = steps.filter(Boolean)
  if (!visible.length) return null

  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div>
          {title && (
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          )}
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s, i) => {
          const Icon = s.icon
          const tone = toneMap[s.tone] ?? toneMap.brand
          const disabled = s.busy || s.done
          return (
            <button
              key={s.title ?? i}
              type="button"
              onClick={s.onClick}
              disabled={disabled}
              className={`group flex flex-col rounded-2xl border p-4 text-left shadow-card transition ${
                s.done
                  ? 'border-money/30 bg-money/5 dark:border-money/30'
                  : `border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900 ${tone.ring} hover:shadow-lg`
              } ${s.busy ? 'cursor-wait opacity-70' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    s.done ? 'bg-money/15 text-money' : tone.iconWrap
                  }`}
                >
                  {Icon && <Icon size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.title}</p>
                  {s.description && (
                    <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {s.description}
                    </p>
                  )}
                </div>
              </div>

              {!s.done && (
                <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${tone.cta}`}>
                  {s.busy ? 'Gerando…' : s.cta ?? 'Começar'}
                  {!s.busy && <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />}
                </span>
              )}
              {s.done && (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-money">
                  ✓ feito
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
