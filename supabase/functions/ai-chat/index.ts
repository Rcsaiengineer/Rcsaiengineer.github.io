import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { message } = await req.json();

    // Buscar contexto financeiro do usuário
    const [walletsData, expensesData, assetsData] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*, expense_categories(*)').eq('user_id', user.id).gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('assets').select('*').limit(50),
    ]);

    const totalPatrimony = walletsData.data?.reduce((sum, w) => sum + (Number(w.total_value) || 0), 0) || 0;
    const totalExpenses = expensesData.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    const contextPrompt = `Contexto Financeiro do Usuário:
- Patrimônio Total: R$ ${totalPatrimony.toFixed(2)}
- Gastos do Mês: R$ ${totalExpenses.toFixed(2)}
- Número de Carteiras: ${walletsData.data?.length || 0}
- Número de Ativos: ${assetsData.data?.length || 0}

Responda à pergunta do usuário com base neste contexto financeiro. Seja prático, objetivo e motivador.`;

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um assistente financeiro inteligente chamado FinanceFlow AI. Ajude o usuário com análises financeiras, sugestões de investimento e controle de despesas. Seja sempre claro, objetivo e motivador.' },
          { role: 'system', content: contextPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Error:', aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
