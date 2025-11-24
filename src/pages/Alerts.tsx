import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Bell, TrendingUp, AlertTriangle, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';

interface Alert {
  id: string;
  alert_type: string;
  target_value: number | null;
  is_active: boolean;
  asset_id: string | null;
  assets?: { ticker: string };
  created_at: string;
}

interface Asset {
  id: string;
  ticker: string;
  current_price: number;
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    alert_type: 'price_target',
    asset_id: '',
    target_value: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load user wallets and assets
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (wallets) {
        const walletIds = wallets.map(w => w.id);
        const { data: assetsData } = await supabase
          .from('assets')
          .select('id, ticker, current_price')
          .in('wallet_id', walletIds);
        setAssets(assetsData || []);
      }

      // Load alerts
      const { data: alertsData, error } = await supabase
        .from('alerts')
        .select('*, assets(ticker)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(alertsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('alerts').insert({
        user_id: user.id,
        alert_type: formData.alert_type,
        asset_id: formData.asset_id || null,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        is_active: true,
      });

      if (error) throw error;
      toast.success('Alerta criado com sucesso!');
      setIsDialogOpen(false);
      setFormData({ alert_type: 'price_target', asset_id: '', target_value: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating alert:', error);
      toast.error('Erro ao criar alerta');
    }
  };

  const toggleAlert = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentState ? 'Alerta desativado' : 'Alerta ativado');
      loadData();
    } catch (error: any) {
      console.error('Error toggling alert:', error);
      toast.error('Erro ao atualizar alerta');
    }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este alerta?')) return;

    try {
      const { error } = await supabase.from('alerts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Alerta excluído com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting alert:', error);
      toast.error('Erro ao excluir alerta');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_target': return <Target className="h-5 w-5" />;
      case 'rebalance_gap': return <TrendingUp className="h-5 w-5" />;
      case 'dividend_announcement': return <DollarSign className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertLabel = (type: string) => {
    const labels: Record<string, string> = {
      price_target: 'Meta de Preço',
      rebalance_gap: 'Gap de Rebalanceamento',
      dividend_announcement: 'Anúncio de Dividendos',
      budget_consumption: 'Consumo de Orçamento',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Alertas Inteligentes</h1>
          <p className="text-muted-foreground">Configure notificações personalizadas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-glow-primary">
              <Plus className="mr-2 h-4 w-4" />
              Novo Alerta
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>Criar Alerta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Alerta</Label>
                <Select
                  value={formData.alert_type}
                  onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="price_target">Meta de Preço</SelectItem>
                    <SelectItem value="rebalance_gap">Gap de Rebalanceamento</SelectItem>
                    <SelectItem value="dividend_announcement">Anúncio de Dividendos</SelectItem>
                    <SelectItem value="budget_consumption">Consumo de Orçamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.alert_type === 'price_target' && (
                <>
                  <div className="space-y-2">
                    <Label>Ativo</Label>
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
                    <Label>Preço Alvo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full">Criar Alerta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {alerts.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum alerta configurado</h3>
              <p className="text-muted-foreground text-center mb-6">
                Crie alertas para ser notificado sobre eventos importantes
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Alerta
              </Button>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${alert.is_active ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted-foreground'}`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div>
                      <CardTitle>{getAlertLabel(alert.alert_type)}</CardTitle>
                      <CardDescription>
                        {alert.assets?.ticker && `${alert.assets.ticker} • `}
                        {alert.target_value && `Meta: R$ ${alert.target_value.toFixed(2)}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={() => toggleAlert(alert.id, alert.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-destructive"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
