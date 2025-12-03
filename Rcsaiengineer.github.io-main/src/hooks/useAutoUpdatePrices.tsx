import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useAutoUpdatePrices() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();

  const updatePrices = async () => {
    if (!user) return;

    try {
      // Get all wallets for user
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (walletsError) throw walletsError;

      const walletIds = wallets?.map(w => w.id) || [];
      if (walletIds.length === 0) return;

      // Get all unique tickers from assets
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, ticker')
        .in('wallet_id', walletIds);

      if (assetsError) throw assetsError;

      const tickers = Array.from(new Set(assets?.map(a => a.ticker) || []));
      if (tickers.length === 0) return;

      console.log('Updating prices for tickers:', tickers);

      // Call fetch-prices edge function
      const { data, error } = await supabase.functions.invoke('fetch-prices', {
        body: { tickers }
      });

      if (error) throw error;

      if (data.success && data.prices) {
        // Update each asset with new price
        const updates = [];
        
        for (const priceData of data.prices) {
          const assetIds = assets
            ?.filter(a => a.ticker.toUpperCase() === priceData.ticker.toUpperCase())
            .map(a => a.id) || [];

          for (const assetId of assetIds) {
            updates.push(
              supabase
                .from('assets')
                .update({ 
                  current_price: priceData.price,
                  updated_at: new Date().toISOString()
                })
                .eq('id', assetId)
            );
          }
        }

        await Promise.all(updates);
        
        // Recalculate wallet totals
        for (const walletId of walletIds) {
          await supabase.rpc('calculate_wallet_total', { 
            wallet_id_param: walletId 
          });
        }

        console.log(`Prices updated: ${data.prices.length} tickers`);
      }
    } catch (error: any) {
      console.error('Error updating prices:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Update immediately on mount
    updatePrices();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(updatePrices, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

  return { updatePrices };
}
