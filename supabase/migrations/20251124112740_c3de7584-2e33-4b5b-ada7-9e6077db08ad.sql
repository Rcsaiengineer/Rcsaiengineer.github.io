-- Tabela de Alertas
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'price_target', 'rebalance_gap', 'dividend_announcement', 'budget_consumption'
  target_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Metas Financeiras
CREATE TABLE public.financial_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  goal_type TEXT NOT NULL, -- 'savings', 'investment', 'passive_income'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Conquistas/Badges
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL, -- 'first_investment', 'consistency_30days', 'dividend_milestone', etc
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level INTEGER NOT NULL DEFAULT 1
);

-- Tabela de Histórico de Cotações
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  source TEXT, -- 'brapi', 'manual', 'yahoo'
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alerts
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for financial_goals
CREATE POLICY "Users can view own goals" ON public.financial_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.financial_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.financial_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.financial_goals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for price_history
CREATE POLICY "Users can view price history for own assets" ON public.price_history FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM assets 
    JOIN wallets ON wallets.id = assets.wallet_id 
    WHERE assets.id = price_history.asset_id AND wallets.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert price history for own assets" ON public.price_history FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM assets 
    JOIN wallets ON wallets.id = assets.wallet_id 
    WHERE assets.id = price_history.asset_id AND wallets.user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();