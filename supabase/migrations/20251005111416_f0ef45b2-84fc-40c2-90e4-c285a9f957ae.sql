-- Fix security issue: Protect user location privacy in public shares

-- 1. Remove the policy that exposes precise GPS coordinates through public shares
DROP POLICY IF EXISTS "Users can view shared expenses" ON public.expenses;

-- Now expenses table is secure:
-- - Only the owner can view their full expenses (including precise locations)
-- - No one else can access the expenses table directly

-- 2. Create a table for public shared expenses with obfuscated location data
CREATE TABLE IF NOT EXISTS public.public_shared_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'TWD',
  category TEXT NOT NULL,
  description TEXT,
  -- Obfuscated location: rounded to 2 decimal places (~1km precision)
  location_name TEXT,
  location_lat_obfuscated NUMERIC, -- ~1km precision instead of <10m
  location_lng_obfuscated NUMERIC,
  expense_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.public_shared_expenses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view public shared expenses (with obfuscated locations)
CREATE POLICY "Anyone can view public shared expenses"
ON public.public_shared_expenses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shares 
  WHERE shares.id = public_shared_expenses.share_id 
  AND shares.is_public = true
));

-- Only share owners can insert
CREATE POLICY "Users can insert their own public shared expenses"
ON public.public_shared_expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only share owners can update
CREATE POLICY "Users can update their own public shared expenses"
ON public.public_shared_expenses
FOR UPDATE
USING (auth.uid() = user_id);

-- Only share owners can delete
CREATE POLICY "Users can delete their own public shared expenses"
ON public.public_shared_expenses
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Create function to sync expense data with location obfuscation
CREATE OR REPLACE FUNCTION public.create_public_shared_expense(_share_id UUID, _expense_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _new_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user owns the expense
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = _expense_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this expense';
  END IF;
  
  -- Insert obfuscated expense data
  INSERT INTO public.public_shared_expenses (
    share_id,
    user_id,
    amount,
    currency,
    category,
    description,
    location_name,
    location_lat_obfuscated,
    location_lng_obfuscated,
    expense_date
  )
  SELECT
    _share_id,
    user_id,
    amount,
    currency,
    category,
    description,
    location_name,
    -- Obfuscate location: round to 2 decimal places (~1.1km precision)
    ROUND(location_lat::numeric, 2),
    ROUND(location_lng::numeric, 2),
    expense_date
  FROM public.expenses
  WHERE id = _expense_id
  RETURNING id INTO _new_id;
  
  RETURN _new_id;
END;
$$;

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_public_shared_expenses_share_id 
ON public.public_shared_expenses(share_id);

CREATE INDEX IF NOT EXISTS idx_public_shared_expenses_user_id 
ON public.public_shared_expenses(user_id);

-- 5. Add helpful comment
COMMENT ON TABLE public.public_shared_expenses IS 
'Public-facing expense data with obfuscated location (1km precision) for privacy protection. 
GPS coordinates are rounded to 2 decimal places to prevent tracking of precise movements.';