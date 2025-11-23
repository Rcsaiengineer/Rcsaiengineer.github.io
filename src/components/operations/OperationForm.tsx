import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Asset {
  id: string;
  ticker: string;
  wallet_id: string;
}

interface OperationFormProps {
  onSuccess: () => void;
}

export function OperationForm({ onSuccess }: OperationFormProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [formData, setFormData] = useState({
    asset_id: '',
    operation_type: '',
    quantity: '',
    price: '',
    fees: '',
    operation_date: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [user]);

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
        operation_type: formData.operation_type,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        fees: formData.fees ? parseFloat(formData.fees) : null,
        operation_date: formData.operation_date,
        notes: formData.notes || null,
      };

      const { error } = await supabase.from('operations').insert(data);
      if (error) throw error;

      toast.success('Operação registrada com sucesso!');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving operation:', error);
      toast.error('Erro ao registrar operação');
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
        <Label htmlFor="operation_type">Tipo de Operação *</Label>
        <Select
          value={formData.operation_type}
          onValueChange={(value) => setFormData({ ...formData, operation_type: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="glass">
            <SelectItem value="buy">Compra</SelectItem>
            <SelectItem value="sell">Venda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            placeholder="100"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preço (R$) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            placeholder="10.50"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fees">Taxas (R$)</Label>
          <Input
            id="fees"
            type="number"
            step="0.01"
            placeholder="5.00"
            value={formData.fees}
            onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="operation_date">Data da Operação *</Label>
          <Input
            id="operation_date"
            type="date"
            value={formData.operation_date}
            onChange={(e) => setFormData({ ...formData, operation_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          placeholder="Adicione notas sobre esta operação..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Salvando...' : 'Registrar Operação'}
      </Button>
    </form>
  );
}
