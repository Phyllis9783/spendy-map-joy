-- Revoke all public access to ensure controlled permissions
REVOKE ALL ON public.expenses_low_precision FROM PUBLIC;
REVOKE ALL ON public.expenses_low_precision FROM anon;

-- Grant SELECT only to authenticated users
-- The view with security_invoker=on will respect RLS from the underlying expenses table
GRANT SELECT ON public.expenses_low_precision TO authenticated;

-- Add a comment documenting the security model
COMMENT ON VIEW public.expenses_low_precision IS 
'Low-precision expense view. Security: Uses security_invoker=on to enforce RLS policies from the expenses table. Users can only view their own expense data (auth.uid() = user_id).';