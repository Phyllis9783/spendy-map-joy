-- Drop the existing view
DROP VIEW IF EXISTS public.expenses_low_precision;

-- Create a SECURITY DEFINER function that explicitly filters by user
CREATE OR REPLACE FUNCTION public.get_expenses_low_precision()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  amount numeric,
  currency text,
  category text,
  description text,
  location_name text,
  location_lat numeric,
  location_lng numeric,
  expense_date timestamp with time zone,
  voice_input text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    amount,
    currency,
    category,
    description,
    location_name,
    round(location_lat::numeric, 2) AS location_lat,
    round(location_lng::numeric, 2) AS location_lng,
    expense_date,
    voice_input,
    created_at,
    updated_at
  FROM public.expenses
  WHERE user_id = auth.uid();
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_expenses_low_precision() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_expenses_low_precision() FROM anon, public;

-- Add comment documenting the security model
COMMENT ON FUNCTION public.get_expenses_low_precision() IS 
'Returns low-precision expense data for the authenticated user. Security: SECURITY DEFINER function with explicit auth.uid() filter ensures users only see their own data.';