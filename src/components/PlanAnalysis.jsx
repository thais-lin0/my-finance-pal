import { useState } from 'react'
import {
  Sparkles,
  FileDown,
  CalendarClock,
  Activity,
  Beef,
  Pill,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import {
  useBodyGoals,
  useMeasurements,
  useDietaryProfile,
  useNutritionDay,
  WEEKDAY_LABELS,
} from '../hooks/useNutrition'
import { useAgenda } from '../hooks/useAgenda'
import { useWeek } from '../context/WeekContext'
import { callNutritionAI } from '../lib/nutritionAI'
import { todayKey } from '../lib/format'

const card =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900'
const sectionTitle =
  'flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white'

// ─────────────────────────────────────────────────────────────────────
//  PlanAnalysis — análise nutricional individualizada em tela, gerada pela
//  IA a partir da anamnese (blocos A–H) + Medidas + Agenda. Renderiza o
//  raciocínio do plano (decisão central, cálculo energético com equação,
//  metas por dia da semana, adequação proteica, suplementos, calibração,
//  lacunas, triagem de segurança, referências com DOI). Permite:
//    • aplicar a periodização por dia da semana nas metas (weekly_calories)
//    • exportar em PDF (window.print sobre uma folha de estilo de impressão)
//  Não é prescrição médica — carrega o disclaimer da IA.
// ─────────────────────────────────────────────────────────────────────
export default function PlanAnalysis() {
  const { profile, saveAnalysis } = useDietaryProfile()
  const bodyGoals = useBodyGoals()
  const measurements = useMeasurements()
  const { weekStart } = useWeek()
  const agenda = useAgenda(weekStart)
  const day = useNutritionDay(todayKey())

  const [analysis, setAnalysis] = useState(profile?.last_analysis ?? null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [applied, setApplied] = useState(false)

  const generatedAt = analysis?.generated_at ?? profile?.last_analysis_at

  const generate = async () => {
    setBusy(true)
    setNote(null)
    setApplied(false)
    try {
      // idade: prefere a do perfil (anamnese); senão deriva da data de nascimento de Medidas
      const ageFromProfile = profile?.age && profile.age !== '__lacuna__' ? Number(profile.age) : null
      const ageFromBirth = bodyGoals.goals?.birth_date
        ? Math.floor((Date.now() - new Date(bodyGoals.goals.birth_date + 'T00:00:00').getTime()) / 31557600000)
        : null
      const age = ageFromProfile ?? ageFromBirth
      const height_cm = (profile?.height_cm && profile.height_cm !== '__lacuna__' ? Number(profile.height_cm) : null) ?? bodyGoals.goals?.height_cm ?? null
      const weight_kg = (profile?.weight_kg && profile.weight_kg !== '__lacuna__' ? Number(profile.weight_kg) : null) ?? measurements.stats?.current ?? null

      const activityCounts = {}
      for (const a of agenda.items) {
        if (a.category) activityCounts[a.category] = (activityCounts[a.category] ?? 0) + 1
      }
      const activities = Object.entries(activityCounts).map(([category, count]) => ({ category, count }))

      const res = await callNutritionAI('plan_analysis', {
        age,
        height_cm,
        weight_kg,
        activities,
        target_weight: bodyGoals.goals?.target_weight ?? null,
        target_date: bodyGoals.goals?.target_date ?? null,
        profile,
      })

      if (res?.mock) {
        setNote(res.headline ?? 'IA não configurada.')
        return
      }
      setAnalysis(res)
      await saveAnalysis(res) // cacheia pra reabrir sem re-gerar
    } catch (e) {
      setNote(`Erro ao gerar análise: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  // Aplica as calorias por dia da semana (da tabela) na periodização das metas.
  const applyWeekly = async () => {
    const weekly = analysis?.weekly
    if (!Array.isArray(weekly) || !weekly.length) return
    const weekly_calories = {}
    for (const w of weekly) {
      if (w.weekday >= 0 && w.weekday <= 6 && w.calories > 0) weekly_calories[w.weekday] = Math.round(w.calories)
    }
    // meta base = média semanal (ou a target_avg do objetivo, se vier)
    const baseCalories =
      Number(analysis?.weekly_avg_calories) ||
      Number(analysis?.goal?.target_avg_calories) ||
      day.baseGoals?.calories ||
      2000
    await day.saveGoals({ weekly_calories, calories: Math.round(baseCalories) })
    setApplied(true)
  }

  const exportPdf = () => {
    // window.print sobre a folha de estilo @media print (index.css) que isola
    // #plan-analysis-print. O usuário escolhe "Salvar como PDF" no diálogo.
    window.print()
  }

  // ── Estado inicial: convite pra gerar ──
  if (!analysis) {
    return (
      <div className={`${card} text-center`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <Sparkles size={24} />
        </div>
        <p className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
          Análise do seu perfil
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          A IA lê sua anamnese, calcula seu gasto energético e monta metas por dia da semana —
          mais calorias nos dias de treino, menos no descanso. Você pode aplicar essas metas e
          exportar tudo em PDF.
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? 'Analisando…' : 'Gerar análise'}
        </button>
        {note && <p className="mt-3 text-xs text-coral">{note}</p>}
      </div>
    )
  }

  const a = analysis

  return (
    <div className="space-y-4">
      {/* Barra de ações (não sai no PDF) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-ink-700 dark:text-slate-300 dark:hover:bg-ink-800"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? 'Analisando…' : 'Regenerar'}
        </button>
        <button
          type="button"
          onClick={applyWeekly}
          className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
        >
          <CheckCircle2 size={15} /> {applied ? 'Metas aplicadas ✓' : 'Aplicar metas por dia'}
        </button>
        <button
          type="button"
          onClick={exportPdf}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <FileDown size={15} /> Exportar PDF
        </button>
      </div>
      {note && <p className="text-xs text-coral print:hidden">{note}</p>}

      {/* Conteúdo imprimível */}
      <div id="plan-analysis-print" className="space-y-4">
        {/* Cabeçalho / decisão central */}
        <div className={`${card} border-2 border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20`}>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
            Análise nutricional individualizada
          </p>
          <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
            {a.headline || 'Plano nutricional'}
          </p>
          {generatedAt && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Gerado em {new Date(generatedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>

        {/* Triagem de segurança (destaque, se houver) */}
        {a.safety?.length > 0 && (
          <div className={`${card} border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20`}>
            <p className={`${sectionTitle} text-amber-800 dark:text-amber-200`}>
              <AlertTriangle size={15} /> Triagem de segurança
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
              {a.safety.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Cálculo energético */}
        {a.energy && (
          <div className={card}>
            <p className={sectionTitle}>
              <Activity size={15} /> Cálculo energético
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stat label="TMB (metabolismo basal)" value={a.energy.tmb ? `${a.energy.tmb} kcal` : '—'} sub={a.energy.tmb_method} />
              <Stat label="TDEE (gasto total)" value={a.energy.tdee ? `${a.energy.tdee} kcal` : '—'} sub={a.energy.tdee_note} />
            </div>
            {a.energy.tmb_equation && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                {a.energy.tmb_equation}
              </p>
            )}
            {a.energy.activity_factor && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Fator de atividade aplicado: {a.energy.activity_factor}
              </p>
            )}
          </div>
        )}

        {/* Objetivo */}
        {a.goal && (
          <div className={card}>
            <p className={sectionTitle}>
              <TrendingUp size={15} /> Objetivo & ajuste
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Objetivo" value={labelGoal(a.goal.type)} />
              <Stat label="Ajuste calórico" value={a.goal.adjustment ?? '—'} />
              <Stat label="Meta média/dia" value={a.goal.target_avg_calories ? `${a.goal.target_avg_calories} kcal` : (a.weekly_avg_calories ? `${a.weekly_avg_calories} kcal` : '—')} />
            </div>
          </div>
        )}

        {/* Metas por dia da semana */}
        {a.weekly?.length > 0 && (
          <div className={card}>
            <p className={sectionTitle}>
              <CalendarClock size={15} /> Metas por dia da semana
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Calorias periodizadas conforme o treino de cada dia. Média: {a.weekly_avg_calories || '—'} kcal/dia.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-ink-700 dark:text-slate-400">
                    <th className="py-1.5 pr-2 font-medium">Dia</th>
                    <th className="py-1.5 pr-2 font-medium">Treino</th>
                    <th className="py-1.5 pr-2 text-right font-medium">kcal</th>
                    <th className="py-1.5 pr-2 text-right font-medium">P</th>
                    <th className="py-1.5 pr-2 text-right font-medium">C</th>
                    <th className="py-1.5 text-right font-medium">G</th>
                  </tr>
                </thead>
                <tbody>
                  {a.weekly.map((w) => (
                    <tr key={w.weekday} className="border-b border-slate-50 last:border-0 dark:border-ink-800/60">
                      <td className="py-1.5 pr-2 font-medium text-slate-800 dark:text-slate-200">{w.day ?? WEEKDAY_LABELS[w.weekday]}</td>
                      <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">{w.training || '—'}</td>
                      <td className="py-1.5 pr-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{w.calories || '—'}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{w.protein_g || '—'}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{w.carbs_g || '—'}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{w.fat_g || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Adequação proteica */}
        {a.protein && (
          <div className={card}>
            <p className={sectionTitle}>
              <Beef size={15} /> Adequação proteica
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Alvo por kg" value={a.protein.target_g_per_kg ? `${a.protein.target_g_per_kg} g/kg` : '—'} />
              <Stat label="Total diário" value={a.protein.total_g ? `${a.protein.total_g} g` : '—'} />
              <Stat label="Por refeição" value={a.protein.per_meal_g ? `${a.protein.per_meal_g} g` : '—'} />
            </div>
            {a.protein.rationale && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{a.protein.rationale}</p>
            )}
          </div>
        )}

        {/* Suplementos */}
        {a.supplements?.length > 0 && (
          <div className={card}>
            <p className={sectionTitle}>
              <Pill size={15} /> Suplementação
            </p>
            <ul className="mt-2 space-y-2">
              {a.supplements.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
                  {s.dose && <span className="text-slate-500 dark:text-slate-400"> · {s.dose}</span>}
                  {s.rationale && <span className="block text-xs text-slate-500 dark:text-slate-400">{s.rationale}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Calibração de 4 semanas */}
        {a.calibration?.length > 0 && (
          <div className={card}>
            <p className={sectionTitle}>
              <TrendingUp size={15} /> Protocolo de calibração
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {a.calibration.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Lacunas */}
        {a.gaps?.length > 0 && (
          <div className={card}>
            <p className={sectionTitle}>
              <AlertTriangle size={15} /> Lacunas da anamnese
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Dados ausentes que reduzem a precisão. Preencher o perfil completo refina a análise.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {a.gaps.map((g, i) => (
                <li key={i}>• {g}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Referências */}
        {a.references?.length > 0 && (
          <div className={card}>
            <p className={sectionTitle}>
              <BookOpen size={15} /> Referências
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {a.references.map((r, i) => (
                <li key={i}>
                  {r.label}
                  {r.doi && <span className="font-mono"> · doi:{r.doi}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] italic text-slate-500 dark:bg-ink-800 dark:text-slate-400">
          {a.disclaimer}
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-ink-800 dark:bg-ink-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

function labelGoal(t) {
  const map = {
    hipertrofia: 'Hipertrofia',
    perda_gordura: 'Perda de gordura',
    recomposicao: 'Recomposição',
    manutencao: 'Manutenção',
    desempenho: 'Desempenho',
  }
  return map[t] ?? t ?? '—'
}
