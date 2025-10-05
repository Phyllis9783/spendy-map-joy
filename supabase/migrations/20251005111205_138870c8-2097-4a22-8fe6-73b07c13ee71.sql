-- Fix security issue: Remove policy that exposes email addresses in profiles table

-- Drop the confusing "Block anonymous access" policy (redundant)
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Drop the problematic public profile viewing policy that exposes email
DROP POLICY IF EXISTS "Users can view basic public profile info" ON public.profiles;

-- Now the profiles table is secure:
-- - Only profile owners can view their own full profile (including email)
-- - Only profile owners can insert/update their profile
-- - No one else can access the profiles table

-- Recreate public_profiles as a proper view without email
DROP VIEW IF EXISTS public.public_profiles CASCADE;

CREATE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.created_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.shares s
  WHERE s.user_id = p.id AND s.is_public = true
);

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Note: Views inherit RLS from base tables, so public_profiles will only show
-- profiles of users who have public shares, and will never expose email field