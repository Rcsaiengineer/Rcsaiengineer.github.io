import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface TaxCalculation {
  month: string;
  totalSales: number;
  totalProfit: number;
  totalLoss: number;
  taxDue: number;
  exemptSales: number;
}

export default function TaxReport() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateTax();
  }, [user, year]);

  const calculateTax = async () => {
    if (!user) return;

    try {
      // Buscar todas as operações do ano
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (!wallets) return;

      const walletIds = wallets.map(w => w.id);

      const { data: assets } = await supabase
        .from('assets')
        .select('id')
        .in('wallet_id', walletIds);

      if (!assets) return;

      const assetIds = assets.map(a => a.id);

      const { data: operations, error } = await supabase
        .from('operations')
        .select('*')
        .in('asset_id', assetIds)
        .gte('operation_date', `${year}-01-01`)
        .lte('operation_date', `${year}-12-31`)
        .order('operation_date', { ascending: true });

      if (error) throw error;

      // Calcular lucro/prejuízo por mês
      const monthlyCalc: Record<string, TaxCalculation> = {};

      // Inicializar todos os meses
      for (let i = 0; i < 12; i++) {
        const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
        monthlyCalc[monthKey] = {
          month: new Date(parseInt(year), i).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          totalSales: 0,
          totalProfit: 0,
          totalLoss: 0,
          taxDue: 0,
          exemptSales: 0,
        };
      }

      // Processar operações
      const assetAveragePrices: Record<string, number> = {};

      operations?.forEach(op => {
        const monthKey = op.operation_date.substring(0, 7);
        
        if (op.operation_type === 'buy') {
          // Atualizar preço médio
          const currentAvg = assetAveragePrices[op.asset_id] || 0;
          assetAveragePrices[op.asset_id] = currentAvg === 0 
            ? op.price 
            : (currentAvg + op.price) / 2;
        } else if (op.operation_type === 'sell' && monthlyCalc[monthKey]) {
          const saleValue = op.quantity * op.price;
          const costBasis = op.quantity * (assetAveragePrices[op.asset_id] || op.price);
          const profitLoss = saleValue - costBasis;

          monthlyCalc[monthKey].totalSales += saleValue;

          if (profitLoss > 0) {
            monthlyCalc[monthKey].totalProfit += profitLoss;
          } else {
            monthlyCalc[monthKey].totalLoss += Math.abs(profitLoss);
          }

          // Isenção para vendas < 20k no mês (ações)
          if (monthlyCalc[monthKey].totalSales < 20000) {
            monthlyCalc[monthKey].exemptSales = monthlyCalc[monthKey].totalSales;
            monthlyCalc[monthKey].taxDue = 0;
          } else {
            // 15% sobre o lucro líquido
            const netProfit = monthlyCalc[monthKey].totalProfit - monthlyCalc[monthKey].totalLoss;
            monthlyCalc[monthKey].taxDue = netProfit > 0 ? netProfit * 0.15 : 0;
          }
        }
      });

      setCalculations(Object.values(monthlyCalc));
    } catch (error: any) {
      console.error('Error calculating tax:', error);
      toast.error('Erro ao calcular impostos');
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

  const totalTaxDue = calculations.reduce((sum, calc) => sum + calc.taxDue, 0);
  const totalProfit = calculations.reduce((sum, calc) => sum + calc.totalProfit, 0);
  const totalLoss = calculations.reduce((sum, calc) => sum + calc.totalLoss, 0);

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
          <h1 className="text-4xl font-bold mb-2">Relatório de IR</h1>
          <p className="text-muted-foreground">Cálculo automático de impostos sobre operações</p>
        </div>
        <div className="flex gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass">
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total de IR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(totalTaxDue)}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Lucros Totais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatCurrency(totalProfit)}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Prejuízos Totais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(totalLoss)}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Lucro Líquido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalProfit - totalLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalProfit - totalLoss)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Card className="glass border-border/50 border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Atenção</p>
              <p className="text-sm text-muted-foreground">
                Este cálculo é uma estimativa. Vendas de ações abaixo de R$ 20.000 por mês são isentas de IR. 
                Consulte um contador para declaração oficial.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calculations.map((calc) => (
              <div key={calc.month} className="p-4 rounded-lg bg-background/30 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize">{calc.month}</h3>
                  {calc.taxDue > 0 && (
                    <span className="text-sm font-semibold text-destructive">
                      IR Devido: {formatCurrency(calc.taxDue)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vendas</p>
                    <p className="font-semibold">{formatCurrency(calc.totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lucros</p>
                    <p className="font-semibold text-success">{formatCurrency(calc.totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prejuízos</p>
                    <p className="font-semibold text-destructive">{formatCurrency(calc.totalLoss)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold">
                      {calc.exemptSales > 0 ? 'Isento' : calc.taxDue > 0 ? 'IR Devido' : 'Sem movimentação'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
