-- Fix 1: Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Fix 2: Create function to validate expense ownership for shares
CREATE OR REPLACE FUNCTION public.can_share_expense(_expense_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.expenses 
    WHERE id = _expense_id 
      AND user_id = auth.uid()
  );
$$;

-- Fix 3: Update shares INSERT policy to validate ownership
DROP POLICY IF EXISTS "Users can insert their own shares" ON public.shares;

CREATE POLICY "Users can insert their own shares" 
ON public.shares
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (expense_id IS NULL OR public.can_share_expense(expense_id))
);