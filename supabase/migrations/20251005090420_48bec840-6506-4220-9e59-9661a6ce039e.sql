-- Create usage_limits table to track daily API usage per user
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  limit_type text NOT NULL CHECK (limit_type IN ('voice_input', 'ai_parse')),
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  usage_count integer NOT NULL DEFAULT 0,
  max_daily_limit integer NOT NULL DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, limit_type, usage_date)
);

-- Create index for faster queries
CREATE INDEX idx_usage_limits_user_date ON public.usage_limits(user_id, usage_date);
CREATE INDEX idx_usage_limits_date ON public.usage_limits(usage_date);

-- Enable RLS
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usage_limits
CREATE POLICY "Users can view their own usage limits"
  ON public.usage_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage limits"
  ON public.usage_limits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage limits"
  ON public.usage_limits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to check and increment usage
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  _user_id uuid,
  _limit_type text,
  _max_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage integer;
  result jsonb;
BEGIN
  -- Get or create today's usage record
  INSERT INTO public.usage_limits (user_id, limit_type, usage_date, usage_count, max_daily_limit)
  VALUES (_user_id, _limit_type, CURRENT_DATE, 0, _max_limit)
  ON CONFLICT (user_id, limit_type, usage_date) 
  DO NOTHING;

  -- Get current usage
  SELECT usage_count INTO current_usage
  FROM public.usage_limits
  WHERE user_id = _user_id 
    AND limit_type = _limit_type 
    AND usage_date = CURRENT_DATE;

  -- Check if limit exceeded
  IF current_usage >= _max_limit THEN
    result := jsonb_build_object(
      'allowed', false,
      'current_usage', current_usage,
      'max_limit', _max_limit,
      'remaining', 0
    );
  ELSE
    -- Increment usage
    UPDATE public.usage_limits
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE user_id = _user_id 
      AND limit_type = _limit_type 
      AND usage_date = CURRENT_DATE;

    result := jsonb_build_object(
      'allowed', true,
      'current_usage', current_usage + 1,
      'max_limit', _max_limit,
      'remaining', _max_limit - current_usage - 1
    );
  END IF;

  RETURN result;
END;
$$;

-- Create function to get current usage status
CREATE OR REPLACE FUNCTION public.get_usage_status(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_object_agg(
    limit_type,
    jsonb_build_object(
      'current_usage', usage_count,
      'max_limit', max_daily_limit,
      'remaining', max_daily_limit - usage_count,
      'reset_at', (usage_date + interval '1 day')::timestamptz
    )
  )
  FROM public.usage_limits
  WHERE user_id = _user_id 
    AND usage_date = CURRENT_DATE;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON public.usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();