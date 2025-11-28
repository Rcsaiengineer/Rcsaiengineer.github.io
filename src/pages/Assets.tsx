import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { AssetForm } from '@/components/assets/AssetForm';
import { AssetCard } from '@/components/assets/AssetCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAutoUpdatePrices } from '@/hooks/useAutoUpdatePrices';

interface Wallet {
  id: string;
  name: string;
  total_value: number;
}

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

const COLORS = ['#157AFF', '#6B2FE3', '#00C68A', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981'];

export default function Assets() {
  const { walletId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Auto-update prices every 15 minutes
  useAutoUpdatePrices();

  useEffect(() => {
    loadWallet();
    loadAssets();
  }, [walletId, user]);

  const loadWallet = async () => {
    if (!user || !walletId) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error: any) {
      console.error('Error loading wallet:', error);
      toast.error('Erro ao carregar carteira');
      navigate('/wallets');
    }
  };

  const loadAssets = async () => {
    if (!user || !walletId) return;

    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('wallet_id', walletId)
        .order('ticker', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error loading assets:', error);
      toast.error('Erro ao carregar ativos');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ativo?')) return;

    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      toast.success('Ativo excluído com sucesso!');
      loadAssets();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast.error('Erro ao excluir ativo');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateTotals = () => {
    const total = assets.reduce((sum, asset) => {
      const current = asset.current_price || asset.average_price;
      return sum + (asset.quantity * current);
    }, 0);

    const invested = assets.reduce((sum, asset) => {
      return sum + (asset.quantity * asset.average_price);
    }, 0);

    const profit = total - invested;
    const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;

    return { total, invested, profit, profitPercent };
  };

  const getChartData = () => {
    const byClass = assets.reduce((acc, asset) => {
      const current = asset.current_price || asset.average_price;
      const value = asset.quantity * current;
      
      if (!acc[asset.asset_class]) {
        acc[asset.asset_class] = 0;
      }
      acc[asset.asset_class] += value;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byClass).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const totals = calculateTotals();
  const chartData = getChartData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/wallets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold mb-2">{wallet?.name}</h1>
            <p className="text-muted-foreground">Gerencie os ativos desta carteira</p>
          </div>
        </div>
        <Button className="shadow-glow-primary" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Valor Total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totals.total)}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Investido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totals.invested)}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Lucro/Prejuízo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totals.profit)}
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Retorno</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold flex items-center ${totals.profitPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totals.profitPercent >= 0 ? <TrendingUp className="mr-2 h-6 w-6" /> : <TrendingDown className="mr-2 h-6 w-6" />}
              {totals.profitPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        {chartData.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Distribuição por Classe</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Assets List */}
        <div className={`${chartData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {assets.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum ativo encontrado</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Adicione seu primeiro ativo para começar a gerenciar esta carteira
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Ativo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingAsset(null);
      }}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
          </DialogHeader>
          <AssetForm
            walletId={walletId!}
            asset={editingAsset}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingAsset(null);
              loadAssets();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
