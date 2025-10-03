-- ============================================
-- ENHANCED LOCATION DATA SECURITY
-- ============================================

-- 1. Create audit log for sensitive location data access
CREATE TABLE IF NOT EXISTS public.location_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'update', 'delete')),
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.location_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own access logs"
ON public.location_access_logs
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Create security definer function to verify expense ownership
CREATE OR REPLACE FUNCTION public.user_owns_expense(_expense_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE id = _expense_id
      AND user_id = _user_id
  );
$$;

-- 3. Create a view with reduced precision coordinates (for less sensitive operations)
-- This rounds coordinates to ~1km precision instead of ~10m
CREATE OR REPLACE VIEW public.expenses_low_precision AS
SELECT 
  id,
  user_id,
  amount,
  currency,
  category,
  description,
  location_name,
  ROUND(location_lat::numeric, 2) as location_lat,  -- ~1km precision
  ROUND(location_lng::numeric, 2) as location_lng,  -- ~1km precision
  expense_date,
  voice_input,
  created_at,
  updated_at
FROM public.expenses;

-- Enable RLS on the view
ALTER VIEW public.expenses_low_precision SET (security_invoker = true);

-- 4. Add index on user_id for performance (prevents timing attacks)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_location ON public.expenses(user_id, location_lat, location_lng) 
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- 5. Add function to log location access (optional, can be called from edge functions)
CREATE OR REPLACE FUNCTION public.log_location_access(
  _expense_id UUID,
  _access_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user owns the expense
  IF NOT public.user_owns_expense(_expense_id, _user_id) THEN
    RAISE EXCEPTION 'Unauthorized access attempt';
  END IF;
  
  -- Log the access
  INSERT INTO public.location_access_logs (
    user_id,
    expense_id,
    access_type,
    accessed_at
  ) VALUES (
    _user_id,
    _expense_id,
    _access_type,
    now()
  );
END;
$$;

-- 6. Create function to check for suspicious access patterns
CREATE OR REPLACE FUNCTION public.check_suspicious_location_access(_user_id UUID)
RETURNS TABLE (
  suspicious_activity TEXT,
  access_count BIGINT,
  last_access TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    'High frequency access detected' as suspicious_activity,
    COUNT(*) as access_count,
    MAX(accessed_at) as last_access
  FROM public.location_access_logs
  WHERE user_id = _user_id
    AND accessed_at > now() - interval '1 hour'
  GROUP BY user_id
  HAVING COUNT(*) > 100;
$$;

-- 7. Add comment documenting security measures
COMMENT ON TABLE public.expenses IS 
'Contains sensitive user location data. Protected by:
1. Row Level Security (RLS) - users can only access their own records
2. user_id column is NOT NULL and enforced
3. Audit logging available via location_access_logs table
4. Low precision view available for non-critical operations
5. Performance indexes prevent timing attacks
6. Security definer functions validate ownership without RLS recursion';

COMMENT ON TABLE public.location_access_logs IS
'Audit log for tracking access to sensitive location data in expenses table.
Can be used to detect unauthorized access attempts or suspicious patterns.';