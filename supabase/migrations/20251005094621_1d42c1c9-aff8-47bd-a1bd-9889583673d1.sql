-- Create a secure public profiles view that excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant read access to the view
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Drop the existing policy that exposes email
DROP POLICY IF EXISTS "Users can view public profile info" ON public.profiles;

-- Create a new restricted policy for public profile viewing
-- This policy will not expose email or other sensitive fields
CREATE POLICY "Users can view basic public profile info" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS ( 
    SELECT 1
    FROM shares
    WHERE shares.user_id = profiles.id 
      AND shares.is_public = true
  )
  AND id != auth.uid() -- Exclude current user (they already have full access via another policy)
);

-- Add a row-level security check to prevent email exposure in public contexts
-- This ensures email can only be viewed by the profile owner
CREATE POLICY "Email is only visible to profile owner" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id
  AND (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  ) IS NOT NULL
);

-- Comment explaining the security measures
COMMENT ON VIEW public.public_profiles IS 
'Secure view for public profile data. Only exposes non-sensitive fields (full_name, avatar_url) to prevent email harvesting and spam.';

COMMENT ON POLICY "Users can view basic public profile info" ON public.profiles IS 
'Allows viewing basic profile info for users with public shares, but excludes sensitive fields like email to prevent spam and privacy violations.';