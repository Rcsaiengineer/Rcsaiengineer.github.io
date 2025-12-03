import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Asset {
  id: string;
  ticker: string;
  asset_class: string;
  sector: string | null;
  broker: string | null;
  quantity: number;
  average_price: number;
  current_price: number | null;
  target_percentage: number | null;
}

interface AssetFormProps {
  walletId: string;
  asset: Asset | null;
  onSuccess: () => void;
}

const ASSET_CLASSES = [
  'Ações',
  'FIIs',
  'Renda Fixa',
  'Criptomoedas',
  'ETFs',
  'BDRs',
  'Internacional',
  'Fundos',
];

const SECTORS = [
  'Tecnologia',
  'Financeiro',
  'Saúde',
  'Energia',
  'Consumo',
  'Industrial',
  'Imobiliário',
  'Commodities',
  'Telecomunicações',
  'Utilities',
];

export function AssetForm({ walletId, asset, onSuccess }: AssetFormProps) {
  const [formData, setFormData] = useState({
    ticker: asset?.ticker || '',
    asset_class: asset?.asset_class || '',
    sector: asset?.sector || '',
    broker: asset?.broker || '',
    quantity: asset?.quantity.toString() || '',
    average_price: asset?.average_price.toString() || '',
    current_price: asset?.current_price?.toString() || '',
    target_percentage: asset?.target_percentage?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        wallet_id: walletId,
        ticker: formData.ticker.toUpperCase(),
        asset_class: formData.asset_class,
        sector: formData.sector || null,
        broker: formData.broker || null,
        quantity: parseFloat(formData.quantity),
        average_price: parseFloat(formData.average_price),
        current_price: formData.current_price ? parseFloat(formData.current_price) : null,
        target_percentage: formData.target_percentage ? parseFloat(formData.target_percentage) : null,
      };

      if (asset) {
        const { error } = await supabase
          .from('assets')
          .update(data)
          .eq('id', asset.id);

        if (error) throw error;
        toast.success('Ativo atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('assets').insert(data);
        if (error) throw error;
        toast.success('Ativo adicionado com sucesso!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast.error('Erro ao salvar ativo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ticker">Ticker *</Label>
          <Input
            id="ticker"
            placeholder="ITSA4"
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="asset_class">Classe de Ativo *</Label>
          <Select
            value={formData.asset_class}
            onValueChange={(value) => setFormData({ ...formData, asset_class: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="glass">
              {ASSET_CLASSES.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sector">Setor</Label>
          <Select
            value={formData.sector}
            onValueChange={(value) => setFormData({ ...formData, sector: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="glass">
              {SECTORS.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="broker">Corretora</Label>
          <Input
            id="broker"
            placeholder="Ex: Clear, Rico"
            value={formData.broker}
            onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
          />
        </div>

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
          <Label htmlFor="average_price">Preço Médio (R$) *</Label>
          <Input
            id="average_price"
            type="number"
            step="0.01"
            placeholder="10.50"
            value={formData.average_price}
            onChange={(e) => setFormData({ ...formData, average_price: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_price">Cotação Atual (R$)</Label>
          <Input
            id="current_price"
            type="number"
            step="0.01"
            placeholder="11.20"
            value={formData.current_price}
            onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_percentage">% Ideal na Carteira</Label>
          <Input
            id="target_percentage"
            type="number"
            step="0.01"
            placeholder="15"
            value={formData.target_percentage}
            onChange={(e) => setFormData({ ...formData, target_percentage: e.target.value })}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Salvando...' : asset ? 'Atualizar Ativo' : 'Adicionar Ativo'}
      </Button>
    </form>
  );
}
