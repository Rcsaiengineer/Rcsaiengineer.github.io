import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, TrendingUp, TrendingDown, DollarSign, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'operation' | 'dividend' | 'expense';
  date: string;
  description: string;
  amount: number;
  icon: any;
  color: string;
}

export function RecentActivity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [user]);

  const loadActivities = async () => {
    if (!user) return;

    try {
      // Buscar operações recentes
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (!wallets || wallets.length === 0) {
        setLoading(false);
        return;
      }

      const walletIds = wallets.map(w => w.id);

      const { data: assets } = await supabase
        .from('assets')
        .select('id, ticker')
        .in('wallet_id', walletIds);

      if (!assets || assets.length === 0) {
        setLoading(false);
        return;
      }

      const assetIds = assets.map(a => a.id);
      const assetMap = assets.reduce((acc, a) => ({ ...acc, [a.id]: a.ticker }), {});

      // Buscar operações
      const { data: operations } = await supabase
        .from('operations')
        .select('id, operation_type, quantity, price, operation_date, asset_id')
        .in('asset_id', assetIds)
        .order('operation_date', { ascending: false })
        .limit(5);

      // Buscar dividendos
      const { data: dividends } = await supabase
        .from('dividends')
        .select('id, amount, payment_date, asset_id')
        .in('asset_id', assetIds)
        .order('payment_date', { ascending: false })
        .limit(5);

      // Buscar despesas
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, description, amount, expense_date')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })
        .limit(5);

      const allActivities: Activity[] = [];

      // Adicionar operações
      (operations || []).forEach(op => {
        allActivities.push({
          id: op.id,
          type: 'operation',
          date: op.operation_date,
          description: `${op.operation_type === 'buy' ? 'Compra' : 'Venda'} de ${assetMap[op.asset_id] || 'Ativo'}`,
          amount: op.quantity * op.price,
          icon: op.operation_type === 'buy' ? TrendingUp : TrendingDown,
          color: op.operation_type === 'buy' ? 'text-success' : 'text-destructive',
        });
      });

      // Adicionar dividendos
      (dividends || []).forEach(div => {
        allActivities.push({
          id: div.id,
          type: 'dividend',
          date: div.payment_date,
          description: `Dividendo de ${assetMap[div.asset_id] || 'Ativo'}`,
          amount: Number(div.amount),
          icon: DollarSign,
          color: 'text-success',
        });
      });

      // Adicionar despesas
      (expenses || []).forEach(exp => {
        allActivities.push({
          id: exp.id,
          type: 'expense',
          date: exp.expense_date,
          description: exp.description,
          amount: Number(exp.amount),
          icon: TrendingDown,
          color: 'text-destructive',
        });
      });

      // Ordenar por data
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error('Error loading activities:', error);
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
      <Card className="glass border-border/50">
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-primary" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <Plus className="h-12 w-12 mb-3" />
            <p>Nenhuma atividade ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 rounded-lg bg-card/30 border border-border/20 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-card ${activity.color}`}>
                  <activity.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(activity.date), 'dd MMM yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <p className={`font-bold ${activity.color}`}>
                {activity.type === 'expense' ? '-' : '+'}{formatCurrency(activity.amount)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}