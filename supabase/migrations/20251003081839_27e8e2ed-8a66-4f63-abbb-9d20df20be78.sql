-- Strengthen audit log integrity to prevent tampering
-- This ensures location_access_logs can only be created via the secure log_location_access() function
-- and can never be modified or deleted, maintaining forensic integrity

-- Prevent direct inserts (only allow through security definer function)
CREATE POLICY "Only system can insert access logs"
ON public.location_access_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Prevent any updates to maintain audit trail integrity
CREATE POLICY "Prevent log modifications"
ON public.location_access_logs
FOR UPDATE
TO authenticated
USING (false);

-- Prevent any deletions to maintain audit trail integrity
CREATE POLICY "Prevent log deletions"
ON public.location_access_logs
FOR DELETE
TO authenticated
USING (false);

-- Add comments documenting the security rationale
COMMENT ON POLICY "Only system can insert access logs" ON public.location_access_logs IS 
'Security enhancement: Prevents direct INSERT operations. Access logs can only be created through the log_location_access() security definer function, ensuring proper validation and preventing log manipulation.';

COMMENT ON POLICY "Prevent log modifications" ON public.location_access_logs IS 
'Security enhancement: Prevents any UPDATE operations on audit logs to maintain forensic integrity. Once logged, access records cannot be altered.';

COMMENT ON POLICY "Prevent log deletions" ON public.location_access_logs IS 
'Security enhancement: Prevents any DELETE operations on audit logs to maintain complete audit trail. Access records are permanent for security investigation purposes.';