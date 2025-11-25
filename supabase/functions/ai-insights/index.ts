import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const { type } = await req.json();

    // Buscar dados do usuário
    const [walletsData, expensesData, assetsData, dividendsData] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*, expense_categories(*)').eq('user_id', user.id).gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('assets').select('*').limit(100),
      supabase.from('dividends').select('*').gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const totalPatrimony = walletsData.data?.reduce((sum, w) => sum + (Number(w.total_value) || 0), 0) || 0;
    const totalExpenses = expensesData.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalDividends = dividendsData.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    let prompt = '';
    
    if (type === 'monthly_summary') {
      prompt = `Você é um consultor financeiro especializado. Analise os dados financeiros e gere um resumo mensal em português brasileiro:

Patrimônio Total: R$ ${totalPatrimony.toFixed(2)}
Gastos do Mês: R$ ${totalExpenses.toFixed(2)}
Dividendos Recebidos: R$ ${totalDividends.toFixed(2)}

Categorias de despesas mais relevantes:
${expensesData.data?.slice(0, 5).map(e => `- ${e.expense_categories?.name}: R$ ${e.amount}`).join('\n')}

Forneça:
1. Um resumo objetivo da situação financeira
2. Pontos positivos e negativos
3. Uma recomendação clara para o próximo mês

Mantenha o texto conciso, direto e motivador.`;
    } else if (type === 'expense_insights') {
      const categoryTotals = expensesData.data?.reduce((acc: any, e: any) => {
        const cat = e.expense_categories?.name || 'Outros';
        acc[cat] = (acc[cat] || 0) + Number(e.amount);
        return acc;
      }, {});

      const topCategory = Object.entries(categoryTotals || {}).sort((a: any, b: any) => b[1] - a[1])[0];

      prompt = `Você é um consultor financeiro especializado. Analise os gastos do usuário:

Total Gasto no Mês: R$ ${totalExpenses.toFixed(2)}
Categoria com maior gasto: ${topCategory?.[0]} (R$ ${(topCategory?.[1] as number)?.toFixed(2)})

Forneça:
1. Um insight sobre o padrão de gastos
2. Onde há oportunidade de economia
3. Uma sugestão prática e aplicável

Seja direto e motivador.`;
    } else if (type === 'investment_suggestion') {
      const assetsByClass = assetsData.data?.reduce((acc: any, a: any) => {
        acc[a.asset_class] = (acc[a.asset_class] || 0) + (Number(a.quantity) * Number(a.current_price || a.average_price));
        return acc;
      }, {});

      prompt = `Você é um consultor de investimentos. Analise a carteira:

Patrimônio Total: R$ ${totalPatrimony.toFixed(2)}
Renda Passiva Mensal: R$ ${totalDividends.toFixed(2)}

Distribuição por classe:
${Object.entries(assetsByClass || {}).map(([cls, val]) => `- ${cls}: R$ ${(val as number).toFixed(2)}`).join('\n')}

Forneça:
1. Análise da diversificação atual
2. Sugestão de onde aportar próximo
3. Justificativa clara e objetiva

Seja prático e direto.`;
    }

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
          { role: 'system', content: 'Você é um consultor financeiro brasileiro especializado. Seja conciso, direto e motivador.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Error:', aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insight = aiData.choices[0].message.content;

    // Salvar insight
    const insightTypes: Record<string, string> = {
      monthly_summary: 'Resumo Mensal',
      expense_insights: 'Insights de Despesas',
      investment_suggestion: 'Sugestão de Investimento',
    };

    await supabase.from('ai_insights').insert({
      user_id: user.id,
      insight_type: type,
      title: insightTypes[type] || 'Insight Financeiro',
      content: insight,
      priority: 'high',
    });

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
