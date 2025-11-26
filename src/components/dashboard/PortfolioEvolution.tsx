import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';

interface Snapshot {
  snapshot_date: string;
  total_value: number;
}

export function PortfolioEvolution() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSnapshots();
  }, [user]);

  const loadSnapshots = async () => {
    if (!user) return;

    try {
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (!wallets || wallets.length === 0) {
        setLoading(false);
        return;
      }

      const walletIds = wallets.map(w => w.id);

      const { data: snapshots, error } = await supabase
        .from('wallet_snapshots')
        .select('*')
        .in('wallet_id', walletIds)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      // Agrupar por data e somar valores
      const grouped = (snapshots || []).reduce((acc, snap) => {
        const date = snap.snapshot_date;
        if (!acc[date]) {
          acc[date] = { date, value: 0 };
        }
        acc[date].value += Number(snap.total_value);
        return acc;
      }, {} as Record<string, any>);

      const chartData = Object.values(grouped).map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        Patrimônio: item.value
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    } finally {
      setLoading(false);
    }
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

  if (data.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Evolução do Patrimônio
          </CardTitle>
          <CardDescription>
            Acompanhe o crescimento do seu patrimônio ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Nenhum dado de evolução ainda. Continue investindo!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary" />
          Evolução do Patrimônio
        </CardTitle>
        <CardDescription>
          Acompanhe o crescimento do seu patrimônio ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Patrimônio"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}