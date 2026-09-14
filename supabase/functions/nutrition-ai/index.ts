// ─────────────────────────────────────────────────────────────
//  Supabase Edge Function: nutrition-ai
//  Deploy: supabase functions deploy nutrition-ai
//
//  IA via OpenRouter (https://openrouter.ai), modelo "openrouter/free"
//  (roteamento automático para um modelo gratuito disponível no momento).
//  Enquanto OPENROUTER_API_KEY não está configurado, responde com um
//  payload de exemplo (mock) para o front funcionar.
//
//  Ações suportadas (body.action):
//   - "parse_food"   { text }          -> { items: [{description, calories, protein_g, carbs_g, fat_g}] }
//   - "meal_plan"    { goals? }         -> { plan: [{weekday, meal, description, calories}] }
//   - "shopping_list"{ plan? }          -> { items: [{name, quantity, category}] }
//   - "insights"     { logs?, goals? }  -> { summary, tips: [] }
//
//  Segredo (Supabase → Project Settings → Edge Functions → Secrets):
//   OPENROUTER_API_KEY
//  NUNCA coloque essa chave no .env do frontend (VITE_*) — qualquer
//  variável VITE_ vai parar no bundle JS público. Configure só como
//  secret da Edge Function: `supabase secrets set OPENROUTER_API_KEY=...`
// ─────────────────────────────────────────────────────────────

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SHOPPING_CATEGORIES = ['Hortifruti', 'Proteínas', 'Laticínios', 'Grãos', 'Bebidas', 'Padaria', 'Congelados', 'Limpeza', 'Outros']
const MEALS = ['Café', 'Almoço', 'Lanche', 'Jantar', 'Ceia']

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const OPENROUTER_ENABLED = Boolean(OPENROUTER_API_KEY)

// Extrai o primeiro bloco JSON balanceado do texto (o modelo às vezes
// envolve a resposta em ```json ... ``` ou adiciona texto solto ao redor).
function extractJson(text) {
  const cleaned = String(text ?? '').replace(/```json|```/gi, '').trim()
  const start = cleaned.search(/[[{]/)
  if (start === -1) throw new Error('Resposta da IA não trouxe JSON')
  const openChar = cleaned[start]
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++
    else if (cleaned[i] === closeChar) {
      depth--
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1))
    }
  }
  throw new Error('JSON incompleto na resposta da IA')
}

async function chatJSON(systemPrompt, userPrompt) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://my-finance-pal.vercel.app',
      'X-Title': 'My Life Pal - Nutricao',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`OpenRouter ${resp.status}: ${body.slice(0, 300)}`)
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content ?? ''
  return extractJson(content)
}

async function invokeOpenRouter(action, payload) {
  switch (action) {
    case 'parse_food': {
      const text = (payload?.text ?? '').trim() || 'Refeição não descrita.'
      const json = await chatJSON(
        'Você é um nutricionista. Estime calorias e macronutrientes da refeição descrita pelo usuário, em português do Brasil. ' +
          'Responda ESTRITAMENTE com um JSON válido, sem markdown e sem texto fora do JSON, no formato: ' +
          '{"items":[{"description":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}. Valores numéricos, não strings.',
        text,
      )
      return { items: Array.isArray(json.items) ? json.items : [] }
    }
    case 'meal_plan': {
      const goals = payload?.goals
      const goalsText = goals
        ? `Meta diária aproximada: ${goals.calories ?? '?'} kcal, ${goals.protein_g ?? '?'}g proteína, ${goals.carbs_g ?? '?'}g carboidrato, ${goals.fat_g ?? '?'}g gordura. Objetivo: ${goals.goal_type ?? 'manutenção'}.`
        : 'Sem metas específicas informadas.'
      // Rotina fixa da Thais — ajuste aqui se a rotina de comida mudar.
      // O objetivo é um cardápio repetitivo de propósito (fácil de seguir e
      // comprar), não variedade de restaurante.
      const json = await chatJSON(
        'Você monta cardápios semanais SIMPLES E REPETITIVOS DE PROPÓSITO, seguindo ESTRITAMENTE a rotina abaixo — ' +
          'não invente pratos fora dela, não sugira receitas elaboradas ou ingredientes que não estejam na lista:\n\n' +
          'ALMOÇO e JANTAR (todos os dias): um carboidrato + uma leguminosa + legumes diversos + uma proteína, sendo:\n' +
          '- Carboidrato: arroz, ou batata, ou batata-doce (varie entre os 3 ao longo da semana).\n' +
          '- Leguminosa: feijão ou lentilha.\n' +
          '- Legumes diversos: legumes no vapor ou salada simples (sem detalhar receita, só "legumes diversos").\n' +
          '- Proteína: alterne entre carne moída com molho, carne moída sem molho, frango desfiado temperado com molho, ' +
          'bife grelhado, frango grelhado — e no máximo 1 vez na semana um estrogonofe.\n\n' +
          'CAFÉ DA MANHÃ (todos os dias): ovo + pão, variando com bacon de vez em quando, e uma fruta simples (banana, mamão, maçã ou similar).\n\n' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: ' +
          '{"plan":[{"weekday":0,"meal":"Café","description":"...","calories":0}]}. ' +
          '"weekday" é 0=Segunda ... 6=Domingo. "meal" deve ser exatamente um destes: ' +
          `${MEALS.join(', ')}. Gere Café, Almoço e Jantar para os 7 dias (21 itens no total), com "description" curta ` +
          '(ex: "Arroz, feijão, legumes diversos e frango grelhado").',
        goalsText,
      )
      return { plan: Array.isArray(json.plan) ? json.plan : [] }
    }
    case 'shopping_list': {
      const plan = payload?.plan
      const planText =
        Array.isArray(plan) && plan.length
          ? `Cardápio planejado da semana:\n${plan.map((p) => `- ${p.description ?? p}`).join('\n')}`
          : 'Nenhum cardápio foi informado; gere uma lista de compras genérica para uma semana de alimentação saudável.'
      const json = await chatJSON(
        'Você monta listas de compras de supermercado a partir de um cardápio, em português do Brasil. ' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: ' +
          '{"items":[{"name":"...","quantity":"...","category":"..."}]}. ' +
          `"category" deve ser exatamente um destes: ${SHOPPING_CATEGORIES.join(', ')}.`,
        planText,
      )
      return { items: Array.isArray(json.items) ? json.items : [] }
    }
    case 'insights': {
      const logs = payload?.logs
      const goals = payload?.goals
      const logsText =
        Array.isArray(logs) && logs.length
          ? `Registros recentes:\n${logs.map((l) => `- ${l.description}: ${l.calories}kcal P${l.protein_g} C${l.carbs_g} G${l.fat_g}`).join('\n')}`
          : 'Sem registros recentes suficientes para análise detalhada.'
      const goalsText = goals ? `Metas do usuário: ${JSON.stringify(goals)}.` : ''
      const json = await chatJSON(
        'Você é um coach de nutrição breve e direto, em português do Brasil. ' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: {"summary":"...","tips":["...","..."]}. ' +
          'O resumo deve ter até 2 frases; gere de 3 a 5 dicas curtas e acionáveis.',
        `${logsText}\n${goalsText}`,
      )
      return { summary: json.summary ?? '', tips: Array.isArray(json.tips) ? json.tips : [] }
    }
    case 'macro_goals': {
      const { age, height_cm, weight_kg, activities, target_weight, target_date } = payload ?? {}
      const activityText =
        Array.isArray(activities) && activities.length
          ? `Atividades físicas nesta semana (agenda de treinos): ${activities.map((a) => `${a.count}x ${a.category}`).join(', ')}.`
          : 'Sem atividades físicas registradas na agenda esta semana (rotina sedentária).'

      // Objetivo: deriva de peso-alvo x peso atual (e do prazo, se houver data-alvo)
      let goalText = 'Sem meta de peso definida; monte para MANUTENÇÃO do peso atual.'
      if (target_weight && weight_kg) {
        const diff = Number(target_weight) - Number(weight_kg)
        if (Math.abs(diff) >= 0.5) {
          const direction = diff < 0 ? 'emagrecer (déficit calórico)' : 'ganhar peso (superávit calórico)'
          let paceText = ''
          if (target_date) {
            const weeks = Math.max(1, Math.ceil((new Date(target_date + 'T00:00:00').getTime() - Date.now()) / (7 * 86400000)))
            const pace = Math.abs(diff) / weeks
            paceText = ` em ${weeks} semanas (~${pace.toFixed(2)} kg/semana)`
          }
          goalText =
            `Meta de peso: ${target_weight} kg (atual: ${weight_kg} kg) — objetivo é ${direction}${paceText}. ` +
            'Ajuste as calorias para esse objetivo de forma SAUDÁVEL E SUSTENTÁVEL (nunca mais que ~1kg de variação de peso por semana, mesmo que o prazo pedido seja mais agressivo), priorizando proteína alta para preservar massa magra.'
        } else {
          goalText = `Peso atual já está próximo da meta (${weight_kg} kg vs meta ${target_weight} kg); monte para MANUTENÇÃO.`
        }
      }

      const profileText = `Idade: ${age ?? '?'} anos. Peso atual: ${weight_kg ?? '?'} kg. Altura: ${height_cm ?? '?'} cm. ${activityText} ${goalText}`
      const json = await chatJSON(
        'Você é um nutricionista esportivo. Com base em idade, peso, altura, nível de atividade física semanal e no OBJETIVO de peso informados, ' +
          'estime o gasto calórico diário (TDEE) e proponha uma meta diária de calorias e macronutrientes alinhada a esse objetivo ' +
          '(sexo biológico não foi informado; use uma estimativa média razoável). ' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: ' +
          '{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"goal_type":"cutting"}. ' +
          '"goal_type" deve ser exatamente "cutting" (emagrecer), "manutencao" ou "bulking" (ganhar peso), conforme o objetivo. Valores numéricos inteiros.',
        profileText,
      )
      return {
        calories: Number(json.calories) || 0,
        protein_g: Number(json.protein_g) || 0,
        carbs_g: Number(json.carbs_g) || 0,
        fat_g: Number(json.fat_g) || 0,
        goal_type: ['cutting', 'manutencao', 'bulking'].includes(json.goal_type) ? json.goal_type : undefined,
      }
    }
    default:
      throw new Error(`Ação desconhecida: ${action}`)
  }
}

// ---- Respostas mock (enquanto OPENROUTER_API_KEY não está configurado) ----
function mockResponse(action, payload) {
  switch (action) {
    case 'parse_food': {
      const text = (payload?.text ?? '').trim() || 'Refeição'
      return {
        mock: true,
        items: [{ description: text, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }],
        note: 'IA não configurada: preencha os macros manualmente ou configure OPENROUTER_API_KEY.',
      }
    }
    case 'meal_plan':
      return { mock: true, plan: [], note: 'IA não configurada: monte o cardápio manualmente.' }
    case 'shopping_list':
      return { mock: true, items: [], note: 'IA não configurada: adicione os itens manualmente.' }
    case 'macro_goals':
      return { mock: true, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, note: 'IA não configurada: defina as metas manualmente.' }
    case 'insights':
      return {
        mock: true,
        summary: 'IA não configurada. Defina OPENROUTER_API_KEY para receber análises automáticas.',
        tips: [],
      }
    default:
      return { mock: true, error: `Ação desconhecida: ${action}` }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { action, ...payload } = await req.json()
    const result = OPENROUTER_ENABLED ? await invokeOpenRouter(action, payload) : mockResponse(action, payload)
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
