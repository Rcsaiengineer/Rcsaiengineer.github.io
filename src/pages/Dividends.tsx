import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { DividendForm } from '@/components/dividends/DividendForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dividend {
  id: string;
  amount: number;
  payment_date: string;
  ex_date: string | null;
  asset_id: string;
  assets: {
    ticker: string;
    asset_class: string;
  };
}

interface MonthlyData {
  month: string;
  total: number;
}

export default function Dividends() {
  const { user } = useAuth();
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadDividends();
  }, [user]);

  const loadDividends = async () => {
    if (!user) return;

    try {
      // First get all user's wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (walletsError) throw walletsError;
      
      if (!wallets || wallets.length === 0) {
        setDividends([]);
        setLoading(false);
        return;
      }

      const walletIds = wallets.map(w => w.id);

      // Get assets from user's wallets
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id')
        .in('wallet_id', walletIds);

      if (assetsError) throw assetsError;

      if (!assets || assets.length === 0) {
        setDividends([]);
        setLoading(false);
        return;
      }

      const assetIds = assets.map(a => a.id);

      // Get dividends for user's assets
      const { data, error } = await supabase
        .from('dividends')
        .select(`
          *,
          assets (
            ticker,
            asset_class
          )
        `)
        .in('asset_id', assetIds)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setDividends(data || []);
    } catch (error: any) {
      console.error('Error loading dividends:', error);
      toast.error('Erro ao carregar dividendos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getMonthlyData = (): MonthlyData[] => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTotal = dividends
        .filter(d => {
          const paymentDate = parseISO(d.payment_date);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        })
        .reduce((sum, d) => sum + d.amount, 0);

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthTotal,
      };
    });
  };

  const getTotalDividends = () => {
    return dividends.reduce((sum, d) => sum + d.amount, 0);
  };

  const getYearDividends = () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return dividends
      .filter(d => parseISO(d.payment_date) >= yearStart)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getMonthDividends = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    return dividends
      .filter(d => parseISO(d.payment_date) >= monthStart)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getTopPayers = () => {
    const byAsset = dividends.reduce((acc, d) => {
      const ticker = d.assets.ticker;
      if (!acc[ticker]) {
        acc[ticker] = { ticker, total: 0, count: 0 };
      }
      acc[ticker].total += d.amount;
      acc[ticker].count += 1;
      return acc;
    }, {} as Record<string, { ticker: string; total: number; count: number }>);

    return Object.values(byAsset)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const monthlyData = getMonthlyData();
  const topPayers = getTopPayers();

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
          <h1 className="text-4xl font-bold mb-2">Dividendos</h1>
          <p className="text-muted-foreground">Acompanhe sua renda passiva</p>
        </div>
        <Button className="shadow-glow-primary" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Dividendo
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-success" />
              Este Mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatCurrency(getMonthDividends())}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              Este Ano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(getYearDividends())}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-accent" />
              Total Recebido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{formatCurrency(getTotalDividends())}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {monthlyData.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar dataKey="total" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Payers and Recent Dividends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Payers */}
        {topPayers.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Maiores Pagadores</CardTitle>
              <CardDescription>Top 5 ativos por dividendos recebidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPayers.map((payer, index) => (
                  <div key={payer.ticker} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{payer.ticker}</p>
                        <p className="text-xs text-muted-foreground">{payer.count} pagamentos</p>
                      </div>
                    </div>
                    <p className="font-bold text-success">{formatCurrency(payer.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Dividends */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Últimos Dividendos</CardTitle>
            <CardDescription>Pagamentos recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {dividends.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum dividendo registrado</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {dividends.slice(0, 10).map((dividend) => (
                  <div key={dividend.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <p className="font-semibold">{dividend.assets.ticker}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(dividend.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="font-bold text-success">{formatCurrency(dividend.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Registrar Dividendo</DialogTitle>
          </DialogHeader>
          <DividendForm
            onSuccess={() => {
              setIsDialogOpen(false);
              loadDividends();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
