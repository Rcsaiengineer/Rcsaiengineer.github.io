import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, TrendingUp, Wallet, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  goal_type: string;
  created_at: string;
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    deadline: '',
    goal_type: 'savings',
  });

  useEffect(() => {
    loadGoals();
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error('Error loading goals:', error);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('financial_goals').insert({
        user_id: user.id,
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount),
        deadline: formData.deadline || null,
        goal_type: formData.goal_type,
      });

      if (error) throw error;
      toast.success('Meta criada com sucesso!');
      setIsDialogOpen(false);
      setFormData({ name: '', target_amount: '', current_amount: '0', deadline: '', goal_type: 'savings' });
      loadGoals();
    } catch (error: any) {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    }
  };

  const updateProgress = async (id: string, newAmount: string) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({ current_amount: parseFloat(newAmount) })
        .eq('id', id);

      if (error) throw error;
      toast.success('Progresso atualizado!');
      loadGoals();
    } catch (error: any) {
      console.error('Error updating progress:', error);
      toast.error('Erro ao atualizar progresso');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'savings': return <Wallet className="h-5 w-5" />;
      case 'investment': return <TrendingUp className="h-5 w-5" />;
      case 'passive_income': return <Target className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getGoalLabel = (type: string) => {
    const labels: Record<string, string> = {
      savings: 'Poupança',
      investment: 'Investimento',
      passive_income: 'Renda Passiva',
    };
    return labels[type] || type;
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const end = new Date(deadline);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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
          <h1 className="text-4xl font-bold mb-2">Metas Financeiras</h1>
          <p className="text-muted-foreground">Defina e acompanhe seus objetivos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-glow-primary">
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>Criar Meta Financeira</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Meta</Label>
                <Input
                  placeholder="Ex: Viagem para Europa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Meta</Label>
                <Select
                  value={formData.goal_type}
                  onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="savings">Poupança</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                    <SelectItem value="passive_income">Renda Passiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Alvo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Atual (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prazo (opcional)</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Criar Meta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <Card className="glass border-border/50 col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma meta definida</h3>
              <p className="text-muted-foreground text-center mb-6">
                Defina metas financeiras para acompanhar seu progresso
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            const daysRemaining = getDaysRemaining(goal.deadline);
            return (
              <Card key={goal.id} className="glass border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-primary/20 text-primary">
                        {getGoalIcon(goal.goal_type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{getGoalLabel(goal.goal_type)}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{formatCurrency(goal.current_amount)}</span>
                      <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(1)}% concluído</p>
                  </div>
                  {daysRemaining !== null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Prazo vencido'}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">Atualizar Progresso</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Novo valor"
                        defaultValue={goal.current_amount}
                        id={`progress-${goal.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById(`progress-${goal.id}`) as HTMLInputElement;
                          updateProgress(goal.id, input.value);
                        }}
                      >
                        Atualizar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
