-- Create user_share_likes table for like functionality
CREATE TABLE IF NOT EXISTS public.user_share_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, share_id)
);

-- Enable RLS
ALTER TABLE public.user_share_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own likes"
  ON public.user_share_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.user_share_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all likes"
  ON public.user_share_likes FOR SELECT
  USING (true);

-- Create RPC function for atomic like toggle
CREATE OR REPLACE FUNCTION public.toggle_share_like(share_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_var UUID := auth.uid();
  like_exists BOOLEAN;
BEGIN
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_share_likes 
    WHERE user_id = user_id_var AND share_id = share_id_input
  ) INTO like_exists;

  IF like_exists THEN
    DELETE FROM public.user_share_likes 
    WHERE user_id = user_id_var AND share_id = share_id_input;
    UPDATE public.shares SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = share_id_input;
  ELSE
    INSERT INTO public.user_share_likes (user_id, share_id) 
    VALUES (user_id_var, share_id_input);
    UPDATE public.shares SET likes_count = likes_count + 1 
    WHERE id = share_id_input;
  END IF;
END;
$$;