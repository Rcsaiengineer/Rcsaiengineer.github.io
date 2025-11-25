-- Create user_settings table for preferences
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_mode boolean DEFAULT false,
  auto_logout_minutes integer DEFAULT 10,
  mfa_enabled boolean DEFAULT false,
  theme text DEFAULT 'dark',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create documents table for file uploads
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  is_encrypted boolean DEFAULT false,
  file_size integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create audit_logs table for security tracking
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create ai_insights table
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'medium',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create benchmarks table
CREATE TABLE public.benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
  benchmark_type text NOT NULL,
  value numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for audit_logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for ai_insights
CREATE POLICY "Users can view own insights"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON public.ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for benchmarks
CREATE POLICY "Users can view own benchmarks"
  ON public.benchmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own benchmarks"
  ON public.benchmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for user_settings updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize user settings on signup
CREATE OR REPLACE FUNCTION public.handle_user_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create user settings on user creation
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_settings();