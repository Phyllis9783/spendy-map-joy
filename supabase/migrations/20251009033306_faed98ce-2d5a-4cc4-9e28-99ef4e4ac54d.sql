-- Fix get_usage_status to return default values instead of null
CREATE OR REPLACE FUNCTION public.get_usage_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Get current usage
  SELECT jsonb_object_agg(
    limit_type,
    jsonb_build_object(
      'current_usage', usage_count,
      'max_limit', max_daily_limit,
      'remaining', max_daily_limit - usage_count,
      'reset_at', (usage_date + interval '1 day')::timestamptz
    )
  ) INTO result
  FROM public.usage_limits
  WHERE user_id = _user_id 
    AND usage_date = CURRENT_DATE;

  -- If no usage today, return default values for both types
  IF result IS NULL THEN
    result := jsonb_build_object(
      'voice_input', jsonb_build_object(
        'current_usage', 0,
        'max_limit', 20,
        'remaining', 20,
        'reset_at', (CURRENT_DATE + interval '1 day')::timestamptz
      ),
      'ai_parse', jsonb_build_object(
        'current_usage', 0,
        'max_limit', 20,
        'remaining', 20,
        'reset_at', (CURRENT_DATE + interval '1 day')::timestamptz
      )
    );
  -- If only one type exists, add default for the missing one
  ELSIF NOT (result ? 'voice_input') THEN
    result := result || jsonb_build_object(
      'voice_input', jsonb_build_object(
        'current_usage', 0,
        'max_limit', 20,
        'remaining', 20,
        'reset_at', (CURRENT_DATE + interval '1 day')::timestamptz
      )
    );
  ELSIF NOT (result ? 'ai_parse') THEN
    result := result || jsonb_build_object(
      'ai_parse', jsonb_build_object(
        'current_usage', 0,
        'max_limit', 20,
        'remaining', 20,
        'reset_at', (CURRENT_DATE + interval '1 day')::timestamptz
      )
    );
  END IF;

  RETURN result;
END;
$function$;