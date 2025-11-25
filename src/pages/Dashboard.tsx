import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Wallet, DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { PrivateValue } from '@/components/PrivateValue';
import { AIInsightsPanel } from '@/components/ai/AIInsightsPanel';
import { AIChat } from '@/components/ai/AIChat';

interface Stats {
  totalPortfolio: number;
  totalWallets: number;
  monthlyExpenses: number;
  monthlyDividends: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPortfolio: 0,
    totalWallets: 0,
    monthlyExpenses: 0,
    monthlyDividends: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Get wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('total_value')
        .eq('user_id', user.id);

      if (walletsError) throw walletsError;

      const totalPortfolio = wallets?.reduce((acc, w) => acc + Number(w.total_value || 0), 0) || 0;
      const totalWallets = wallets?.length || 0;

      // Get current month expenses
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('expense_date', startOfMonth.toISOString());

      if (expensesError) throw expensesError;

      const monthlyExpenses = expenses?.reduce((acc, e) => acc + Number(e.amount || 0), 0) || 0;

      // Get current month dividends
      const { data: dividends, error: dividendsError } = await supabase
        .from('dividends')
        .select('amount, assets!inner(wallet_id, wallets!inner(user_id))')
        .gte('payment_date', startOfMonth.toISOString());

      if (dividendsError) throw dividendsError;

      const userDividends = dividends?.filter((d: any) => 
        d.assets?.wallets?.user_id === user.id
      ) || [];

      const monthlyDividends = userDividends.reduce((acc, d) => acc + Number(d.amount || 0), 0);

      setStats({
        totalPortfolio,
        totalWallets,
        monthlyExpenses,
        monthlyDividends,
      });
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
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
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos seus investimentos e finanças</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Portfolio */}
        <Card className="glass border-border/50 hover:shadow-glow-primary transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patrimônio Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <PrivateValue value={formatCurrency(stats.totalPortfolio)} />
            </div>
            <p className="text-xs text-success flex items-center mt-2">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +0% este mês
            </p>
          </CardContent>
        </Card>

        {/* Total Wallets */}
        <Card className="glass border-border/50 hover:shadow-glow-secondary transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Carteiras Ativas
            </CardTitle>
            <Wallet className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWallets}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Gerenciando {stats.totalWallets} carteira{stats.totalWallets !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Dividends */}
        <Card className="glass border-border/50 hover:shadow-glow-success transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dividendos (Mês)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              <PrivateValue value={formatCurrency(stats.monthlyDividends)} />
            </div>
            <p className="text-xs text-success flex items-center mt-2">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Renda passiva
            </p>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="glass border-border/50 hover:shadow-glow-primary transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas (Mês)
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              <PrivateValue value={formatCurrency(stats.monthlyExpenses)} />
            </div>
            <p className="text-xs text-destructive flex items-center mt-2">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Gastos do mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel />

      {/* AI Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIChat />
        
        {/* Welcome Message */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Bem-vindo ao FinanceFlow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Este é seu centro de controle financeiro premium. Aqui você pode:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                Gerenciar múltiplas carteiras de investimento
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-secondary rounded-full mr-3" />
                Acompanhar dividendos e operações
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-success rounded-full mr-3" />
                Controlar despesas pessoais
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                Realizar rebalanceamento inteligente
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-secondary rounded-full mr-3" />
                Insights automáticos com IA
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
