-- Phase 1.1: Add DELETE policy for user_challenges
CREATE POLICY "Users can delete their own challenges" 
ON public.user_challenges
FOR DELETE
USING (auth.uid() = user_id);

-- Phase 1.2: Create function to clean up old location access logs (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_location_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_access_logs
  WHERE accessed_at < now() - interval '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_location_logs() IS 
'Deletes location access logs older than 90 days for data privacy compliance. Returns the number of deleted records.';