// ─────────────────────────────────────────────────────────────
//  Supabase Edge Function: nutrition-ai
//  Deploy: supabase functions deploy nutrition-ai
//
//  IA via OpenRouter (https://openrouter.ai), modelo "openrouter/free"
//  (roteamento automático para um modelo gratuito disponível no momento).
//  Enquanto OPENROUTER_API_KEY não está configurado, responde com um
//  payload de exemplo (mock) para o front funcionar.
//
//  Todas as ações aceitam opcionalmente `profile` (o perfil alimentar da
//  aba Configurações — dietary_profile: diet_style, restrictions, dislikes,
//  preferred_carbs, preferred_proteins, preferred_breakfast, variety_level,
//  notes), usado por buildProfileText() pra personalizar o prompt por usuário.
//
//  Ações suportadas (body.action):
//   - "parse_food"   { text, profile? }                              -> { items: [{description, calories, protein_g, carbs_g, fat_g}] }
//                     Usa o FatSecret NLP (dados nutricionais reais) quando
//                     FATSECRET_KEY/FATSECRET_SECRET estão configurados; se o
//                     FatSecret não reconhecer os alimentos (erro 211) ou não
//                     estiver configurado, cai no OpenRouter (estimativa do LLM).
//   - "meal_plan"    { goals?, profile? }                             -> { plan: [{weekday, meal, description, calories}] }
//   - "shopping_list"{ plan?, profile? }                              -> { items: [{name, quantity, category}] }
//   - "insights"     { logs?, goals?, profile? }                      -> { summary, tips: [] }
//   - "macro_goals"  { age?, height_cm?, weight_kg?, activities?, target_weight?, target_date?, profile? }
//                                                                     -> { calories, protein_g, carbs_g, fat_g, water_ml, goal_type, meal_split }
//
//  Segredos (Supabase → Project Settings → Edge Functions → Secrets):
//   OPENROUTER_API_KEY                 (LLM: cardápio, insights, metas, fallback do parse_food)
//   FATSECRET_KEY / FATSECRET_SECRET   (FatSecret OAuth 1.0 — nutrição real no parse_food)
//  NUNCA coloque essas chaves no .env do frontend (VITE_*) — qualquer
//  variável VITE_ vai parar no bundle JS público. Configure só como
//  secret da Edge Function:
//    supabase secrets set OPENROUTER_API_KEY=...
//    supabase secrets set FATSECRET_KEY=... FATSECRET_SECRET=...
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

const DIET_STYLE_LABELS = {
  vegetariano: 'vegetariano (sem carne nem peixe)',
  vegano: 'vegano (sem nenhum produto animal)',
  low_carb: 'low carb',
  cetogenica: 'cetogênica (muito baixo carboidrato)',
}
const VARIETY_LABELS = {
  bem_simples: 'prefere um cardápio BEM SIMPLES E REPETITIVO, fácil de seguir e comprar — não invente pratos elaborados fora do que a pessoa indicou',
  equilibrado: 'prefere repetir a base do cardápio, variando temperos/proteínas ao longo da semana',
  variado: 'gosta de variedade — pode sugerir pratos diferentes a cada dia',
}

// Converte o perfil alimentar (anamnese em Configurações) num parágrafo de
// preferências que entra no conteúdo enviado à IA. Sem perfil preenchido,
// retorna vazio e a IA usa um padrão brasileiro genérico e equilibrado.
function buildProfileText(profile) {
  if (!profile) return ''
  const lines = []
  if (profile.diet_style && DIET_STYLE_LABELS[profile.diet_style]) lines.push(`Estilo alimentar: ${DIET_STYLE_LABELS[profile.diet_style]}.`)
  if (profile.restrictions) lines.push(`Restrições/alergias (respeite sempre): ${profile.restrictions}.`)
  if (profile.dislikes) lines.push(`Não gosta / evitar: ${profile.dislikes}.`)
  if (profile.preferred_carbs) lines.push(`Carboidratos preferidos: ${profile.preferred_carbs}.`)
  if (profile.preferred_proteins) lines.push(`Proteínas preferidas: ${profile.preferred_proteins}.`)
  if (profile.preferred_breakfast) lines.push(`Café da manhã preferido: ${profile.preferred_breakfast}.`)
  if (profile.variety_level && VARIETY_LABELS[profile.variety_level]) lines.push(`Variedade: a pessoa ${VARIETY_LABELS[profile.variety_level]}.`)
  if (profile.notes) lines.push(`Observações da pessoa: ${profile.notes}.`)
  return lines.length ? `\n\nPreferências do usuário (siga estritamente quando fizer sentido):\n${lines.join('\n')}` : ''
}

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const OPENROUTER_ENABLED = Boolean(OPENROUTER_API_KEY)

// ─────────────────────────────────────────────────────────────
//  FatSecret Platform API — Natural Language Processing (nutrição real)
//  Autenticação OAuth 1.0 (HMAC-SHA1). Diferente do OAuth 2.0, não exige
//  buscar um token antes nem depende de IP fixo (a assinatura autentica
//  cada requisição) — ideal para Edge Function sem IP estável.
//  Docs: https://platform.fatsecret.com/docs/v1/natural.language.processing
// ─────────────────────────────────────────────────────────────
const FATSECRET_KEY = Deno.env.get('FATSECRET_KEY')
const FATSECRET_SECRET = Deno.env.get('FATSECRET_SECRET')
const FATSECRET_ENABLED = Boolean(FATSECRET_KEY && FATSECRET_SECRET)
const FATSECRET_NLP_URL = 'https://platform.fatsecret.com/rest/natural-language-processing/v1'

// Codificação percentual estrita do OAuth 1.0 (RFC 3986): só A-Za-z0-9-_.~
// ficam livres; todo o resto é %XX maiúsculo.
function oauthEncode(str) {
  return encodeURIComponent(String(str)).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
}

// Assina uma requisição OAuth 1.0 e retorna o header Authorization.
// O body JSON do NLP NÃO entra na base string (só os parâmetros oauth_*),
// conforme OAuth 1.0 para corpos non-form-encoded.
async function oauth1Header(method, url, secret, key) {
  const params = {
    oauth_consumer_key: key,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  }
  // base string: METHOD&url&sorted-encoded-params
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${oauthEncode(k)}=${oauthEncode(params[k])}`)
    .join('&')
  const baseString = [method.toUpperCase(), oauthEncode(url), oauthEncode(paramString)].join('&')
  // signing key: consumerSecret& (sem token secret — 2-legged)
  const signingKey = `${oauthEncode(secret)}&`

  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(baseString))
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))

  const headerParams = { ...params, oauth_signature: signature }
  const header =
    'OAuth ' +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${oauthEncode(k)}="${oauthEncode(headerParams[k])}"`)
      .join(', ')
  return header
}

// Chama o FatSecret NLP com o texto livre da refeição e devolve os itens já
// no formato que o Diário consome: {description, calories, protein_g, carbs_g, fat_g}.
// Lança erro quando não há chaves, quando a API falha, ou quando nenhum
// alimento é detectado (erro 211) — o chamador decide o fallback.
async function fatsecretParse(text) {
  const body = JSON.stringify({
    user_input: text.slice(0, 1000), // limite de 1000 caracteres do endpoint
    include_food_data: false,
    // region/language (pt-BR) são Premier Exclusive; o reconhecimento do
    // texto em português já funciona no plano padrão com a região US default.
  })
  const auth = await oauth1Header('POST', FATSECRET_NLP_URL, FATSECRET_SECRET, FATSECRET_KEY)
  const resp = await fetch(FATSECRET_NLP_URL, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body,
  })
  const raw = await resp.text()
  if (!resp.ok) throw new Error(`FatSecret ${resp.status}: ${raw.slice(0, 300)}`)

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('FatSecret: resposta não-JSON')
  }
  // erro estruturado da API (ex.: 211 "No food item detected")
  if (data?.error) throw new Error(`FatSecret erro ${data.error.code}: ${data.error.message}`)

  const responses = data?.food_response
  if (!Array.isArray(responses) || responses.length === 0) {
    throw new Error('FatSecret: nenhum alimento detectado')
  }

  const items = responses
    .map((r) => {
      const n = r?.eaten?.total_nutritional_content
      if (!n) return null // item sem nutrição (ex.: serving não padrão de restaurante)
      return {
        description: r.food_entry_name || r?.eaten?.food_name_singular || 'Alimento',
        calories: Math.round(Number(n.calories) || 0),
        protein_g: Math.round(Number(n.protein) || 0),
        carbs_g: Math.round(Number(n.carbohydrate) || 0),
        fat_g: Math.round(Number(n.fat) || 0),
      }
    })
    .filter(Boolean)

  if (items.length === 0) throw new Error('FatSecret: itens sem informação nutricional')
  return items
}

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

async function chatOnce(systemPrompt, userPrompt) {
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
  return data?.choices?.[0]?.message?.content ?? ''
}

// O roteador "openrouter/free" pode cair num modelo fraco que ignora a
// instrução de responder só em JSON. Como é estocástico, tentar de novo
// (com um lembrete mais forte) resolve a maioria dos casos — não dá pra
// forçar um schema de verdade (tipo Pydantic) num modelo gratuito que
// muda a cada chamada, mas o retry cobre o caso comum de forma barata.
async function chatJSON(systemPrompt, userPrompt, retries = 2) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    const prompt =
      attempt === 0
        ? userPrompt
        : `${userPrompt}\n\n(Sua resposta anterior não veio em JSON válido ou veio incompleta. Responda de novo, ESTRITAMENTE e SOMENTE com o objeto JSON pedido — nenhum texto, explicação ou markdown antes ou depois.)`
    try {
      const content = await chatOnce(systemPrompt, prompt)
      return extractJson(content)
    } catch (e) {
      lastError = e
      // erro de rede/HTTP (401/402/429/5xx) não se resolve tentando de novo
      // com o mesmo prompt — só vale retry pra falha de parsing do JSON
      if (String(e?.message ?? '').startsWith('OpenRouter ')) throw e
    }
  }
  throw lastError
}

async function openRouterParseFood(payload) {
  const text = (payload?.text ?? '').trim() || 'Refeição não descrita.'
  const json = await chatJSON(
    'Você é um nutricionista. Estime calorias e macronutrientes da refeição descrita pelo usuário, em português do Brasil. ' +
      'Responda ESTRITAMENTE com um JSON válido, sem markdown e sem texto fora do JSON, no formato: ' +
      '{"items":[{"description":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}. Valores numéricos, não strings.',
    text + buildProfileText(payload?.profile),
  )
  return { items: Array.isArray(json.items) ? json.items : [] }
}

async function invokeOpenRouter(action, payload) {
  switch (action) {
    case 'parse_food': {
      return await openRouterParseFood(payload)
    }
    case 'meal_plan': {
      const goals = payload?.goals
      const goalsText = goals
        ? `Meta diária aproximada: ${goals.calories ?? '?'} kcal, ${goals.protein_g ?? '?'}g proteína, ${goals.carbs_g ?? '?'}g carboidrato, ${goals.fat_g ?? '?'}g gordura. Objetivo: ${goals.goal_type ?? 'manutenção'}.`
        : 'Sem metas específicas informadas.'
      // O padrão (sem perfil preenchido em Configurações) é um cardápio
      // brasileiro equilibrado; as preferências da anamnese (buildProfileText)
      // é que tornam isso específico pra cada usuário — inclusive repetitivo
      // de propósito, se a pessoa marcou "bem simples" no nível de variedade.
      const json = await chatJSON(
        'Você monta cardápios semanais brasileiros, práticos e realistas. ' +
          'ALMOÇO e JANTAR devem ter um carboidrato + uma leguminosa (feijão/lentilha) + legumes diversos + uma proteína. ' +
          'CAFÉ DA MANHÃ deve ser simples (ex: ovo, pão, frutas, iogurte). ' +
          'Se houver preferências do usuário informadas abaixo, siga-as estritamente (o que ela gosta, não gosta, restrições e nível de variedade desejado) — ' +
          'não invente pratos fora do que a pessoa indicou gostar/comer. Sem preferências informadas, use bom senso de uma dieta equilibrada. ' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: ' +
          '{"plan":[{"weekday":0,"meal":"Café","description":"...","calories":0}]}. ' +
          '"weekday" é 0=Segunda ... 6=Domingo. "meal" deve ser exatamente um destes: ' +
          `${MEALS.join(', ')}. Gere Café, Almoço e Jantar para os 7 dias (21 itens no total), com "description" curta ` +
          '(ex: "Arroz, feijão, legumes diversos e frango grelhado").',
        goalsText + buildProfileText(payload?.profile),
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
          'Se houver restrições/alergias ou alimentos que o usuário não gosta informados abaixo, NÃO inclua itens relacionados a eles. ' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: ' +
          '{"items":[{"name":"...","quantity":"...","category":"..."}]}. ' +
          `"category" deve ser exatamente um destes: ${SHOPPING_CATEGORIES.join(', ')}.`,
        planText + buildProfileText(payload?.profile),
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
          'O resumo deve ter até 2 frases; gere de 3 a 5 dicas curtas e acionáveis, levando em conta as preferências do usuário se houver.',
        `${logsText}\n${goalsText}` + buildProfileText(payload?.profile),
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

      const bioText = `Idade: ${age ?? '?'} anos. Peso atual: ${weight_kg ?? '?'} kg. Altura: ${height_cm ?? '?'} cm. ${activityText} ${goalText}`
      const json = await chatJSON(
        'Você é um nutricionista esportivo. Com base em idade, peso, altura, nível de atividade física semanal e no OBJETIVO de peso informados, ' +
          'estime o gasto calórico diário (TDEE) e proponha uma meta diária de calorias e macronutrientes alinhada a esse objetivo ' +
          '(sexo biológico não foi informado; use uma estimativa média razoável). Se houver restrições/estilo alimentar informados, ' +
          'considere-os ao pensar nas fontes de proteína/carboidrato implícitas nos macros. ' +
          'Além disso, estime uma meta diária de consumo de ÁGUA em ml, usando como base ~35ml por kg de peso corporal, ' +
          'ajustada pra cima conforme o nível de atividade física semanal (mais treino = mais água). ' +
          'Distribua também a meta de calorias entre as refeições (Café, Almoço, Lanche, Jantar, Ceia) em PERCENTUAIS que somem 100, ' +
          'coerentes com o objetivo e com a rotina (ex.: mais peso no almoço/jantar; ceia leve). ' +
          'Responda ESTRITAMENTE com JSON, sem markdown, no formato: ' +
          '{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"water_ml":0,"goal_type":"cutting","meal_split":{"Café":25,"Almoço":35,"Lanche":10,"Jantar":25,"Ceia":5}}. ' +
          '"goal_type" deve ser exatamente "cutting" (emagrecer), "manutencao" ou "bulking" (ganhar peso), conforme o objetivo. Valores numéricos inteiros.',
        bioText + buildProfileText(payload?.profile),
      )
      // meal_split só é aceito se tiver as 5 refeições e somar ~100
      let mealSplit: Record<string, number> | undefined
      const ms = json.meal_split
      if (ms && typeof ms === 'object') {
        const meals = ['Café', 'Almoço', 'Lanche', 'Jantar', 'Ceia']
        const clean: Record<string, number> = {}
        let sum = 0
        for (const m of meals) {
          const v = Number(ms[m]) || 0
          clean[m] = v
          sum += v
        }
        if (sum >= 95 && sum <= 105) mealSplit = clean
      }
      return {
        calories: Number(json.calories) || 0,
        protein_g: Number(json.protein_g) || 0,
        carbs_g: Number(json.carbs_g) || 0,
        fat_g: Number(json.fat_g) || 0,
        water_ml: Number(json.water_ml) || 0,
        goal_type: ['cutting', 'manutencao', 'bulking'].includes(json.goal_type) ? json.goal_type : undefined,
        meal_split: mealSplit,
      }
    }
    default:
      throw new Error(`Ação desconhecida: ${action}`)
  }
}

// parse_food híbrido: FatSecret (nutrição real) → fallback OpenRouter (estimativa)
// → mock (nada configurado). Cada item ganha `source` pra a UI poder sinalizar
// de onde veio o número, se quiser.
async function handleParseFood(payload) {
  if (FATSECRET_ENABLED) {
    const text = (payload?.text ?? '').trim()
    if (text) {
      try {
        const items = await fatsecretParse(text)
        return { items, source: 'fatsecret' }
      } catch (e) {
        // FatSecret não reconheceu / falhou → tenta o LLM, se disponível
        console.warn('FatSecret falhou, tentando fallback:', String(e?.message ?? e))
      }
    }
  }
  if (OPENROUTER_ENABLED) {
    const res = await openRouterParseFood(payload)
    return { ...res, source: 'openrouter' }
  }
  return mockResponse('parse_food', payload)
}

// ---- Respostas mock (enquanto nenhuma IA está configurada) ----
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
      return { mock: true, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, water_ml: 0, note: 'IA não configurada: defina as metas manualmente.' }
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
    let result
    if (action === 'parse_food') {
      // parse_food tem caminho próprio (FatSecret → OpenRouter → mock)
      result = await handleParseFood(payload)
    } else {
      result = OPENROUTER_ENABLED ? await invokeOpenRouter(action, payload) : mockResponse(action, payload)
    }
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
