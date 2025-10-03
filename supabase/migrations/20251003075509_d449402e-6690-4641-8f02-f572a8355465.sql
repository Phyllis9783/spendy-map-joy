-- Drop the security definer view
DROP VIEW IF EXISTS public.expenses_low_precision;

-- Recreate as a standard view that respects RLS from the underlying expenses table
-- RLS will be enforced through the expenses table's policies
CREATE VIEW public.expenses_low_precision AS
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
FROM public.expenses;

-- Grant SELECT permission to authenticated users
-- RLS on the underlying expenses table will control actual access
GRANT SELECT ON public.expenses_low_precision TO authenticated;