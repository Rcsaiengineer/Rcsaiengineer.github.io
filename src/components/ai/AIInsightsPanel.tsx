import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, DollarSign, PieChart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const generateInsight = async (type: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { type },
      });

      if (error) throw error;

      toast({
        title: "Insight gerado!",
        description: "Um novo insight foi adicionado à sua lista.",
      });

      loadInsights();
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o insight. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="col-span-full glass border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              FinanceFlow AI
            </CardTitle>
            <CardDescription>Insights inteligentes sobre suas finanças</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInsight('monthly_summary')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
              Resumo Mensal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInsight('expense_insights')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
              Análise de Gastos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInsight('investment_suggestion')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PieChart className="h-4 w-4 mr-2" />}
              Sugestão de Investimento
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Clique em um dos botões acima para gerar insights personalizados com IA
          </p>
        ) : (
          insights.map((insight) => (
            <Card key={insight.id} className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">{insight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insight.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
