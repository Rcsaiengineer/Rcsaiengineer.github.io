import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calculator, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Wallet {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  ticker: string;
  asset_class: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  target_percentage: number | null;
  wallet_id: string;
}

interface RebalanceItem {
  ticker: string;
  asset_class: string;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  idealValue: number;
  gap: number;
  gapPercent: number;
  suggestedAmount: number;
}

export default function Rebalance() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contribution, setContribution] = useState<string>('');
  const [rebalanceData, setRebalanceData] = useState<RebalanceItem[]>([]);
  const [totalPortfolio, setTotalPortfolio] = useState(0);

  useEffect(() => {
    loadWallets();
  }, [user]);

  useEffect(() => {
    if (selectedWallet) {
      loadAssets();
    }
  }, [selectedWallet]);

  const loadWallets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (error: any) {
      console.error('Error loading wallets:', error);
      toast.error('Erro ao carregar carteiras');
    }
  };

  const loadAssets = async () => {
    if (!selectedWallet) return;

    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('wallet_id', selectedWallet);

      if (error) throw error;
      setAssets(data || []);
      
      const total = (data || []).reduce((sum, asset) => {
        const price = asset.current_price || asset.average_price;
        return sum + (asset.quantity * price);
      }, 0);
      setTotalPortfolio(total);
    } catch (error: any) {
      console.error('Error loading assets:', error);
      toast.error('Erro ao carregar ativos');
    }
  };

  const calculateRebalance = () => {
    if (!contribution || parseFloat(contribution) <= 0) {
      toast.error('Informe um valor de aporte válido');
      return;
    }

    const contributionAmount = parseFloat(contribution);
    const futureTotal = totalPortfolio + contributionAmount;

    // Calculate current positions and gaps
    const items: RebalanceItem[] = assets
      .filter(asset => asset.target_percentage && asset.target_percentage > 0)
      .map(asset => {
        const currentPrice = asset.current_price || asset.average_price;
        const currentValue = asset.quantity * currentPrice;
        const currentPercent = totalPortfolio > 0 ? (currentValue / totalPortfolio) * 100 : 0;
        const targetPercent = asset.target_percentage || 0;
        const idealValue = futureTotal * (targetPercent / 100);
        const gap = idealValue - currentValue;
        const gapPercent = targetPercent - currentPercent;

        return {
          ticker: asset.ticker,
          asset_class: asset.asset_class,
          currentValue,
          currentPercent,
          targetPercent,
          idealValue,
          gap,
          gapPercent,
          suggestedAmount: 0,
        };
      });

    // Calculate total positive gaps
    const totalPositiveGaps = items.reduce((sum, item) => {
      return sum + (item.gap > 0 ? item.gap : 0);
    }, 0);

    // Distribute contribution proportionally to gaps
    if (totalPositiveGaps > 0) {
      items.forEach(item => {
        if (item.gap > 0) {
          item.suggestedAmount = (item.gap / totalPositiveGaps) * contributionAmount;
        }
      });
    }

    // Sort by gap descending
    items.sort((a, b) => b.gap - a.gap);

    setRebalanceData(items);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getBestInvestment = () => {
    if (rebalanceData.length === 0) return null;
    return rebalanceData[0];
  };

  const best = getBestInvestment();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Rebalanceamento Inteligente</h1>
        <p className="text-muted-foreground">Otimize seus aportes com precisão matemática</p>
      </div>

      {/* Configuration */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="mr-2 h-5 w-5 text-primary" />
            Configuração do Rebalanceamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wallet">Carteira</Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
                <SelectContent className="glass">
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contribution">Valor do Aporte (R$)</Label>
              <Input
                id="contribution"
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button 
                className="w-full shadow-glow-primary" 
                onClick={calculateRebalance}
                disabled={!selectedWallet || !contribution}
              >
                Calcular Distribuição
              </Button>
            </div>
          </div>

          {selectedWallet && totalPortfolio > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Valor Total da Carteira</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPortfolio)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Investment Alert */}
      {best && (
        <Card className="glass border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center text-success">
              <TrendingUp className="mr-2 h-5 w-5" />
              Melhor Oportunidade de Aporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-2">
              O ativo <span className="font-bold text-success">{best.ticker}</span> está{' '}
              <span className="font-bold">{formatPercent(Math.abs(best.gapPercent))}</span> abaixo do ideal.
            </p>
            <p className="text-muted-foreground">
              Sugestão de aporte: <span className="font-bold text-success">{formatCurrency(best.suggestedAmount)}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rebalance Table */}
      {rebalanceData.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Distribuição Sugerida</CardTitle>
            <CardDescription>
              Baseado na fórmula: Aporte Sugerido = (Gap do Ativo / Soma dos Gaps Positivos) × Aporte Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2">Ativo</th>
                    <th className="text-left py-3 px-2">Classe</th>
                    <th className="text-right py-3 px-2">% Atual</th>
                    <th className="text-right py-3 px-2">% Ideal</th>
                    <th className="text-right py-3 px-2">Gap</th>
                    <th className="text-right py-3 px-2">Aportar</th>
                  </tr>
                </thead>
                <tbody>
                  {rebalanceData.map((item, index) => (
                    <tr key={index} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                      <td className="py-3 px-2 font-semibold">{item.ticker}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{item.asset_class}</td>
                      <td className="py-3 px-2 text-right">{formatPercent(item.currentPercent)}</td>
                      <td className="py-3 px-2 text-right">{formatPercent(item.targetPercent)}</td>
                      <td className={`py-3 px-2 text-right font-semibold ${item.gap > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {formatPercent(item.gapPercent)}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-success">
                        {item.suggestedAmount > 0 ? formatCurrency(item.suggestedAmount) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedWallet && assets.filter(a => a.target_percentage && a.target_percentage > 0).length === 0 && (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum ativo com % ideal definido</h3>
            <p className="text-muted-foreground text-center">
              Configure o percentual ideal para cada ativo na página de Ativos para usar o rebalanceamento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
