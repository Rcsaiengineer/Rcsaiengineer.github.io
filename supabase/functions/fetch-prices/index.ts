import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAPI_URL = 'https://brapi.dev/api/quote';
const CACHE_DURATION_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Use service role for price operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { tickers } = await req.json();
    
    if (!Array.isArray(tickers) || tickers.length === 0) {
      throw new Error('tickers array required');
    }

    console.log('Fetching prices for tickers:', tickers);

    const results: any[] = [];
    const tickersToFetch: string[] = [];

    // Check cache first
    for (const ticker of tickers) {
      const { data: cached } = await supabaseAdmin
        .from('price_cache')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.last_updated).getTime();
        const cacheAgeMinutes = cacheAge / (1000 * 60);

        if (cacheAgeMinutes < CACHE_DURATION_MINUTES) {
          console.log(`Using cached price for ${ticker}`);
          results.push({
            ticker: cached.ticker,
            price: cached.price,
            currency: cached.currency,
            cached: true
          });
          continue;
        }
      }

      tickersToFetch.push(ticker.toUpperCase());
    }

    // Fetch fresh prices for non-cached tickers
    if (tickersToFetch.length > 0) {
      const tickerList = tickersToFetch.join(',');
      const brapiUrl = `${BRAPI_URL}/${tickerList}?fundamental=false&dividends=false`;
      
      console.log('Fetching from brapi:', brapiUrl);

      const brapiResponse = await fetch(brapiUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!brapiResponse.ok) {
        console.error('Brapi error:', brapiResponse.status);
        throw new Error('Failed to fetch prices from brapi');
      }

      const brapiData = await brapiResponse.json();

      if (brapiData.results && Array.isArray(brapiData.results)) {
        for (const item of brapiData.results) {
          const price = item.regularMarketPrice;
          
          if (price && price > 0) {
            // Update cache
            await supabaseAdmin
              .from('price_cache')
              .upsert({
                ticker: item.symbol,
                price: price,
                currency: item.currency || 'BRL',
                source: 'brapi',
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'ticker'
              });

            results.push({
              ticker: item.symbol,
              price: price,
              currency: item.currency || 'BRL',
              cached: false
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        prices: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fetch prices error:', error);
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