-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create wallets/portfolios table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_value DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view own wallets"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON public.wallets FOR DELETE
  USING (auth.uid() = user_id);

-- Create assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL, -- Ações, FIIs, Renda Fixa, Cripto, Internacional
  sector TEXT,
  broker TEXT,
  quantity DECIMAL(15, 8) NOT NULL DEFAULT 0,
  average_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_price DECIMAL(15, 2) DEFAULT 0,
  target_percentage DECIMAL(5, 2) DEFAULT 0, -- percentual ideal na carteira
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Assets policies
CREATE POLICY "Users can view assets in own wallets"
  ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = assets.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assets in own wallets"
  ON public.assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = assets.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assets in own wallets"
  ON public.assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = assets.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assets in own wallets"
  ON public.assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = assets.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#157AFF',
  is_fixed BOOLEAN DEFAULT FALSE,
  monthly_budget DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Expense categories policies
CREATE POLICY "Users can view own expense categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense categories"
  ON public.expense_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense categories"
  ON public.expense_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense categories"
  ON public.expense_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT, -- crédito, débito, pix, dinheiro
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_period TEXT, -- mensal, anual
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create operations table (compra/venda)
CREATE TABLE public.operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- compra, venda
  quantity DECIMAL(15, 8) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  fees DECIMAL(10, 2) DEFAULT 0,
  operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on operations
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- Operations policies
CREATE POLICY "Users can view operations for own assets"
  ON public.operations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      JOIN public.wallets ON wallets.id = assets.wallet_id
      WHERE assets.id = operations.asset_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert operations for own assets"
  ON public.operations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets
      JOIN public.wallets ON wallets.id = assets.wallet_id
      WHERE assets.id = operations.asset_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update operations for own assets"
  ON public.operations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      JOIN public.wallets ON wallets.id = assets.wallet_id
      WHERE assets.id = operations.asset_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete operations for own assets"
  ON public.operations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      JOIN public.wallets ON wallets.id = assets.wallet_id
      WHERE assets.id = operations.asset_id
      AND wallets.user_id = auth.uid()
    )
  );

-- Create dividends table
CREATE TABLE public.dividends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  ex_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on dividends
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

-- Dividends policies
CREATE POLICY "Users can view dividends for own assets"
  ON public.dividends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      JOIN public.wallets ON wallets.id = assets.wallet_id
      WHERE assets.id = dividends.asset_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert dividends for own assets"
  ON public.dividends FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets
      JOIN public.wallets ON wallets.id = assets.wallet_id
      WHERE assets.id = dividends.asset_id
      AND wallets.user_id = auth.uid()
    )
  );

-- Create wallet_snapshots table
CREATE TABLE public.wallet_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  total_value DECIMAL(15, 2) NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on wallet_snapshots
ALTER TABLE public.wallet_snapshots ENABLE ROW LEVEL SECURITY;

-- Wallet snapshots policies
CREATE POLICY "Users can view snapshots for own wallets"
  ON public.wallet_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = wallet_snapshots.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert snapshots for own wallets"
  ON public.wallet_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = wallet_snapshots.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();