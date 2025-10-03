-- Drop the existing view
DROP VIEW IF EXISTS public.expenses_low_precision;

-- Recreate the view with security_barrier option to enforce RLS from underlying table
CREATE VIEW public.expenses_low_precision 
WITH (security_barrier = true)
AS
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