import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, TrendingUp, Target, Calendar, Award, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  achievement_type: string;
  earned_at: string;
  level: number;
}

const allAchievements = [
  { type: 'first_investment', name: 'Primeiro Investimento', description: 'Realizou seu primeiro investimento', icon: Star, color: 'text-yellow-500' },
  { type: 'consistency_30days', name: 'Consistência', description: '30 dias consecutivos registrando operações', icon: Calendar, color: 'text-blue-500' },
  { type: 'dividend_milestone_100', name: 'Coletor de Dividendos', description: 'Recebeu R$ 100 em dividendos', icon: TrendingUp, color: 'text-green-500' },
  { type: 'portfolio_10k', name: 'Patrimônio 10k', description: 'Patrimônio atingiu R$ 10.000', icon: Trophy, color: 'text-purple-500' },
  { type: 'diversification_5', name: 'Diversificação', description: 'Possui 5 ativos diferentes', icon: Target, color: 'text-orange-500' },
  { type: 'perfect_rebalance', name: 'Rebalanceamento Perfeito', description: 'Rebalanceou portfólio conforme metas', icon: Award, color: 'text-pink-500' },
];

export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error: any) {
      console.error('Error loading achievements:', error);
      toast.error('Erro ao carregar conquistas');
    } finally {
      setLoading(false);
    }
  };

  const hasAchievement = (type: string) => {
    return achievements.some(a => a.achievement_type === type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const earnedCount = achievements.length;
  const totalCount = allAchievements.length;
  const progressPercentage = (earnedCount / totalCount) * 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Conquistas</h1>
        <p className="text-muted-foreground">Acompanhe seu progresso e desbloqueie recompensas</p>
      </div>

      {/* Progress Card */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Progresso Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{earnedCount} / {totalCount}</span>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {progressPercentage.toFixed(0)}%
              </Badge>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allAchievements.map((achievement) => {
          const earned = hasAchievement(achievement.type);
          const Icon = achievement.icon;
          
          return (
            <Card
              key={achievement.type}
              className={`glass border-border/50 transition-all ${
                earned
                  ? 'shadow-glow-primary hover:scale-105'
                  : 'opacity-60 grayscale'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-4 rounded-lg ${earned ? 'bg-primary/20' : 'bg-muted/20'}`}>
                    {earned ? (
                      <Icon className={`h-8 w-8 ${achievement.color}`} />
                    ) : (
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  {earned && (
                    <Badge className="bg-success text-white">
                      Conquistado
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{achievement.name}</CardTitle>
                <CardDescription>{achievement.description}</CardDescription>
              </CardHeader>
              {earned && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Desbloqueado em {new Date(achievements.find(a => a.achievement_type === achievement.type)?.earned_at || '').toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
