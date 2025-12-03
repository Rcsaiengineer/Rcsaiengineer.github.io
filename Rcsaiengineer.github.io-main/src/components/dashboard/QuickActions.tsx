import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, Target, PieChart } from 'lucide-react';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: 'Nova Operação',
      description: 'Registrar compra ou venda',
      color: 'text-primary',
      onClick: () => navigate('/operations'),
    },
    {
      icon: DollarSign,
      label: 'Adicionar Despesa',
      description: 'Controle seus gastos',
      color: 'text-destructive',
      onClick: () => navigate('/expenses'),
    },
    {
      icon: TrendingUp,
      label: 'Novo Dividendo',
      description: 'Registrar renda passiva',
      color: 'text-success',
      onClick: () => navigate('/dividends'),
    },
    {
      icon: Target,
      label: 'Criar Meta',
      description: 'Definir objetivo financeiro',
      color: 'text-secondary',
      onClick: () => navigate('/goals'),
    },
    {
      icon: PieChart,
      label: 'Rebalancear',
      description: 'Otimizar carteira',
      color: 'text-primary',
      onClick: () => navigate('/rebalance'),
    },
  ];

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col items-center justify-center p-4 space-y-2 hover:shadow-glow-primary transition-all"
              onClick={action.onClick}
            >
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <div className="text-center">
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}