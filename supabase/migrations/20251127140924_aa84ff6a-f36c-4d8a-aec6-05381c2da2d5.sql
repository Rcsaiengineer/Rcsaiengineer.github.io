-- Create shortcuts_expenses table for quick expense entry
CREATE TABLE IF NOT EXISTS public.shortcuts_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  categoria_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  forma_pagamento_padrao TEXT,
  descricao_padrao TEXT,
  valor_padrao NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shortcuts_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own shortcuts"
ON public.shortcuts_expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shortcuts"
ON public.shortcuts_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shortcuts"
ON public.shortcuts_expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shortcuts"
ON public.shortcuts_expenses FOR DELETE
USING (auth.uid() = user_id);

-- Add document_id to expenses table to link receipts
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Add encrypted flag to expenses for sensitive data
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create table for import templates (to remember column mappings)
CREATE TABLE IF NOT EXISTS public.import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('carteira', 'despesas')),
  mapeamento JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own templates"
ON public.import_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
ON public.import_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON public.import_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON public.import_templates FOR DELETE
USING (auth.uid() = user_id);

-- Create table for API rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only service role should access this)
CREATE POLICY "Service role can manage rate limits"
ON public.api_rate_limits FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint 
ON public.api_rate_limits(user_id, endpoint, window_start);

-- Create table for price cache
CREATE TABLE IF NOT EXISTS public.price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BRL',
  source TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS - everyone can read cached prices
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price cache"
ON public.price_cache FOR SELECT
TO authenticated
USING (true);

-- Only service role can update prices
CREATE POLICY "Service role can manage prices"
ON public.price_cache FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster price lookups
CREATE INDEX IF NOT EXISTS idx_price_cache_ticker ON public.price_cache(ticker);

-- Enhance audit_logs to track more events
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'));

-- Create trigger to auto-update updated_at on shortcuts
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_shortcuts_updated_at
BEFORE UPDATE ON public.shortcuts_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();