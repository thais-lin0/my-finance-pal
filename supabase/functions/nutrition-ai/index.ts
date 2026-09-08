// ─────────────────────────────────────────────────────────────
//  Supabase Edge Function: nutrition-ai
//  Deploy: supabase functions deploy nutrition-ai
//
//  STUB preparado para AWS Bedrock. Enquanto BEDROCK não está
//  configurado, responde com um payload de exemplo (mock) para o
//  front funcionar. Quando ligar a IA, preencha invokeBedrock().
//
//  Ações suportadas (body.action):
//   - "parse_food"   { text }          -> { items: [{description, calories, protein_g, carbs_g, fat_g}] }
//   - "meal_plan"    { goals, prefs }   -> { plan: [{weekday, meal, description, calories}] }
//   - "shopping_list"{ plan }           -> { items: [{name, quantity, category}] }
//   - "insights"     { logs, goals }    -> { summary, tips: [] }
//
//  Segredos (Supabase → Project Settings → Edge Functions → Secrets):
//   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BEDROCK_MODEL_ID
// ─────────────────────────────────────────────────────────────

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BEDROCK_ENABLED = Boolean(Deno.env.get('AWS_ACCESS_KEY_ID') && Deno.env.get('BEDROCK_MODEL_ID'))

// TODO: implementar quando o Bedrock estiver habilitado.
// Sugestão: usar @aws-sdk/client-bedrock-runtime (via esm.sh) e
// InvokeModelCommand com o prompt específico de cada `action`.
async function invokeBedrock(_action, _payload) {
  throw new Error('Bedrock ainda não configurado')
}

// ---- Respostas mock (enquanto a IA não está ligada) ----
function mockResponse(action, payload) {
  switch (action) {
    case 'parse_food': {
      // devolve o texto como um item único com estimativa neutra —
      // o usuário ajusta os números na UI
      const text = (payload?.text ?? '').trim() || 'Refeição'
      return {
        mock: true,
        items: [
          { description: text, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        ],
        note: 'IA não configurada: preencha os macros manualmente ou habilite o Bedrock.',
      }
    }
    case 'meal_plan':
      return { mock: true, plan: [], note: 'IA não configurada: monte o cardápio manualmente.' }
    case 'shopping_list':
      return { mock: true, items: [], note: 'IA não configurada: adicione os itens manualmente.' }
    case 'insights':
      return {
        mock: true,
        summary: 'IA não configurada. Habilite o Bedrock para receber análises automáticas.',
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
    if (BEDROCK_ENABLED) {
      result = await invokeBedrock(action, payload)
    } else {
      result = mockResponse(action, payload)
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
