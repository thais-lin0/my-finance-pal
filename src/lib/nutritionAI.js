import { supabase } from './supabase'

// Chama a Edge Function nutrition-ai (Bedrock). Enquanto a IA não está
// configurada, a function responde em modo mock (mock: true) e a UI
// segue funcionando com preenchimento manual.
export async function callNutritionAI(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('nutrition-ai', {
    body: { action, ...payload },
  })
  if (error) throw error
  return data
}
