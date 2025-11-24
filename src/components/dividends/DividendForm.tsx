import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Asset {
  id: string;
  ticker: string;
  wallet_id: string;
}

interface Dividend {
  id: string;
  asset_id: string;
  amount: number;
  payment_date: string;
  ex_date: string | null;
}

interface DividendFormProps {
  dividend?: Dividend | null;
  onSuccess: () => void;
}

export function DividendForm({ dividend, onSuccess }: DividendFormProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [formData, setFormData] = useState({
    asset_id: dividend?.asset_id || '',
    amount: dividend?.amount?.toString() || '',
    payment_date: dividend?.payment_date || '',
    ex_date: dividend?.ex_date || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [user]);

  useEffect(() => {
    if (dividend) {
      setFormData({
        asset_id: dividend.asset_id,
        amount: dividend.amount.toString(),
        payment_date: dividend.payment_date,
        ex_date: dividend.ex_date || '',
      });
    }
  }, [dividend]);

  const loadAssets = async () => {
    if (!user) return;

    try {
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (walletsError) throw walletsError;
      
      if (!wallets || wallets.length === 0) return;

      const walletIds = wallets.map(w => w.id);

      const { data, error } = await supabase
        .from('assets')
        .select('id, ticker, wallet_id')
        .in('wallet_id', walletIds)
        .order('ticker', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error loading assets:', error);
      toast.error('Erro ao carregar ativos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        asset_id: formData.asset_id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        ex_date: formData.ex_date || null,
      };

      if (dividend) {
        const { error } = await supabase
          .from('dividends')
          .update(data)
          .eq('id', dividend.id);
        if (error) throw error;
        toast.success('Dividendo atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('dividends').insert(data);
        if (error) throw error;
        toast.success('Dividendo registrado com sucesso!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving dividend:', error);
      toast.error('Erro ao salvar dividendo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="asset_id">Ativo *</Label>
        <Select
          value={formData.asset_id}
          onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um ativo" />
          </SelectTrigger>
          <SelectContent className="glass">
            {assets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.ticker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor (R$) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="50.00"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_date">Data de Pagamento *</Label>
        <Input
          id="payment_date"
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ex_date">Data Ex-Dividendo</Label>
        <Input
          id="ex_date"
          type="date"
          value={formData.ex_date}
          onChange={(e) => setFormData({ ...formData, ex_date: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Salvando...' : dividend ? 'Atualizar Dividendo' : 'Registrar Dividendo'}
      </Button>
    </form>
  );
}
