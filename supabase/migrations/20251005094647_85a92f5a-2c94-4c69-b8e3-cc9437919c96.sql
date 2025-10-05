-- Fix the security_definer_view linter warning by enabling SECURITY INVOKER mode
-- This ensures the view respects RLS policies and uses the querying user's permissions
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- Verify the view is properly configured
COMMENT ON VIEW public.public_profiles IS 
'Secure view for public profile data with SECURITY INVOKER enabled. Only exposes non-sensitive fields (full_name, avatar_url) to prevent email harvesting and spam. Respects RLS policies of the querying user.';