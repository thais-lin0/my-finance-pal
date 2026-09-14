import { supabase } from './supabase'

// Chama a Edge Function nutrition-ai (Bedrock). Enquanto a IA não está
// configurada, a function responde em modo mock (mock: true) e a UI
// segue funcionando com preenchimento manual.
export async function callNutritionAI(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('nutrition-ai', {
    body: { action, ...payload },
  })
  if (error) {
    // O supabase-js só expõe uma mensagem genérica ("non-2xx status code");
    // o motivo real (ex: erro da OpenRouter, secret ausente) vem no corpo
    // JSON da resposta, disponível em error.context (a Response crua).
    let detail = error.message
    try {
      const body = await error.context?.clone().json()
      if (body?.error) detail = body.error
    } catch {
      // corpo não veio em JSON (ex: function nem chegou a rodar) — mantém a mensagem genérica
    }
    throw new Error(detail)
  }
  return data
}
