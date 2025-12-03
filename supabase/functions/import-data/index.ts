import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  [key: string]: string | number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { tipo, data: csvData, mapeamento, wallet_id } = await req.json();
    
    if (!tipo || !csvData || !mapeamento) {
      throw new Error('Missing required fields');
    }

    console.log(`Processing ${tipo} import for user:`, user.id);

    const results = {
      imported_count: 0,
      skipped_count: 0,
      errors: [] as string[],
      new_categories_created: [] as string[]
    };

    if (tipo === 'despesas') {
      // Process expenses import
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i] as ImportRow;
        try {
          const expenseData: any = {
            user_id: user.id,
            description: row[mapeamento.descricao] || 'Sem descrição',
            amount: parseFloat(String(row[mapeamento.valor] || 0)),
            expense_date: row[mapeamento.data] || new Date().toISOString().split('T')[0],
            payment_method: row[mapeamento.forma_pagamento] || null,
            is_recurring: row[mapeamento.recorrente] === 'Sim' || row[mapeamento.recorrente] === 'true'
          };

          // Handle category
          const categoryName = String(row[mapeamento.categoria] || 'Outros');
          
          // Check if category exists
          let { data: category, error: catError } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', categoryName)
            .single();

          if (catError || !category) {
            // Create new category
            const { data: newCat, error: createError } = await supabase
              .from('expense_categories')
              .insert({
                user_id: user.id,
                name: categoryName,
                color: '#' + Math.floor(Math.random()*16777215).toString(16)
              })
              .select()
              .single();

            if (createError) {
              throw createError;
            }
            
            category = newCat;
            results.new_categories_created.push(categoryName);
          }

          expenseData.category_id = category!.id;

          // Insert expense
          const { error: insertError } = await supabase
            .from('expenses')
            .insert(expenseData);

          if (insertError) {
            throw insertError;
          }

          results.imported_count++;
        } catch (error) {
          results.skipped_count++;
          results.errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    } else if (tipo === 'carteira') {
      // Process portfolio import
      if (!wallet_id) {
        throw new Error('wallet_id required for portfolio import');
      }

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i] as ImportRow;
        try {
          const assetData = {
            wallet_id,
            ticker: String(row[mapeamento.ticker] || '').toUpperCase(),
            asset_class: String(row[mapeamento.classe] || 'Ação'),
            sector: row[mapeamento.setor] ? String(row[mapeamento.setor]) : null,
            broker: row[mapeamento.corretora] ? String(row[mapeamento.corretora]) : null,
            quantity: parseFloat(String(row[mapeamento.quantidade] || 0)),
            average_price: parseFloat(String(row[mapeamento.preco_medio] || 0)),
            current_price: row[mapeamento.cotacao_atual] 
              ? parseFloat(String(row[mapeamento.cotacao_atual])) 
              : null,
            target_percentage: row[mapeamento.percentual_ideal]
              ? parseFloat(String(row[mapeamento.percentual_ideal]))
              : null
          };

          if (!assetData.ticker || assetData.quantity <= 0) {
            throw new Error('Ticker inválido ou quantidade zero');
          }

          // Check if asset already exists
          const { data: existing } = await supabase
            .from('assets')
            .select('id')
            .eq('wallet_id', wallet_id)
            .eq('ticker', assetData.ticker)
            .single();

          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('assets')
              .update(assetData)
              .eq('id', existing.id);

            if (updateError) throw updateError;
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('assets')
              .insert(assetData);

            if (insertError) throw insertError;
          }

          results.imported_count++;
        } catch (error) {
          results.skipped_count++;
          results.errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
