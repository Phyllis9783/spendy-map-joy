-- Strengthen profiles table security with explicit NULL checks and authentication requirements

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create enhanced policy with explicit authentication check and NULL protection
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Add comment documenting the security enhancement
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 
'Enhanced security: Explicitly requires authentication (TO authenticated), checks auth.uid() IS NOT NULL, and ensures users can only view their own profile (auth.uid() = id). This prevents any potential RLS bypass scenarios.';

-- Strengthen location_access_logs table security

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own access logs" ON public.location_access_logs;

-- Create enhanced policy with explicit authentication check and NULL protection
CREATE POLICY "Users can view their own access logs"
ON public.location_access_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Add comment documenting the security enhancement
COMMENT ON POLICY "Users can view their own access logs" ON public.location_access_logs IS 
'Enhanced security: Explicitly requires authentication (TO authenticated), checks auth.uid() IS NOT NULL, and ensures users can only view their own access logs (auth.uid() = user_id). This prevents unauthorized access to IP addresses and tracking data.';

-- Strengthen expenses table security with additional validation

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;

-- Create enhanced policy with explicit authentication check
CREATE POLICY "Users can view their own expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Add comment documenting the security enhancement
COMMENT ON POLICY "Users can view their own expenses" ON public.expenses IS 
'Enhanced security: Explicitly requires authentication (TO authenticated), checks auth.uid() IS NOT NULL, and ensures users can only view their own expenses including location data (auth.uid() = user_id). This prevents cross-user data access and protects financial behavior patterns.';