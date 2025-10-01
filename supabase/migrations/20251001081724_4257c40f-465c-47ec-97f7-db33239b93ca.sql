-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  monthly_budget DECIMAL(10, 2) DEFAULT 0,
  preferred_currency TEXT DEFAULT 'TWD',
  preferred_language TEXT DEFAULT 'zh-TW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TWD',
  category TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  voice_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- 'weekly', 'monthly'
  category TEXT, -- 'food', 'coffee', 'transport', etc.
  target_amount DECIMAL(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Challenges policies (public read)
CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = true);

-- Create user_challenges table (junction table)
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS on user_challenges
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

-- User challenges policies
CREATE POLICY "Users can view their own challenges"
  ON public.user_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
  ON public.user_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON public.user_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- Create shares table for social sharing
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  share_text TEXT,
  is_public BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on shares
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Shares policies
CREATE POLICY "Users can view their own shares"
  ON public.shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public shares"
  ON public.shares FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own shares"
  ON public.shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shares"
  ON public.shares FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares"
  ON public.shares FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample challenges
INSERT INTO public.challenges (title, description, challenge_type, category, target_amount, duration_days, icon, color) VALUES
  ('一週外食控制挑戰', '一週外食少於 1000 元', 'weekly', 'food', 1000.00, 7, 'utensils', 'primary'),
  ('咖啡節制月', '一個月咖啡花費少於 1500 元', 'monthly', 'coffee', 1500.00, 30, 'coffee', 'secondary'),
  ('交通費節約週', '一週交通費少於 500 元', 'weekly', 'transport', 500.00, 7, 'car', 'accent'),
  ('購物自制挑戰', '一個月購物少於 3000 元', 'monthly', 'shopping', 3000.00, 30, 'shopping-bag', 'warning');