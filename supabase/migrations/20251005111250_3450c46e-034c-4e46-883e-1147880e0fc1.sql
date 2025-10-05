-- Fix security issue: Replace view with table for better security

-- Drop the view
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Create public_profiles as a real table (not a view)
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view public profiles (this table only contains non-sensitive data)
CREATE POLICY "Anyone can view public profiles"
ON public.public_profiles
FOR SELECT
USING (true);

-- Only profile owners can update their public profile
CREATE POLICY "Users can update their own public profile"
ON public.public_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Only profile owners can insert their public profile
CREATE POLICY "Users can insert their own public profile"
ON public.public_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Only profile owners can delete their public profile
CREATE POLICY "Users can delete their own public profile"
ON public.public_profiles
FOR DELETE
USING (auth.uid() = id);

-- Create function to sync profiles to public_profiles (without email)
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if user has public shares
  IF EXISTS (
    SELECT 1 FROM public.shares 
    WHERE user_id = NEW.id AND is_public = true
  ) THEN
    -- Upsert into public_profiles (excluding email and other sensitive fields)
    INSERT INTO public.public_profiles (id, full_name, avatar_url, created_at)
    VALUES (NEW.id, NEW.full_name, NEW.avatar_url, NEW.created_at)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;
  ELSE
    -- Remove from public_profiles if no public shares
    DELETE FROM public.public_profiles WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync profiles to public_profiles
DROP TRIGGER IF EXISTS on_profile_change ON public.profiles;
CREATE TRIGGER on_profile_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_profile();

-- Also sync when shares change (when user makes their first public share)
CREATE OR REPLACE FUNCTION public.sync_public_profile_on_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a share becomes public, sync that user's profile
  IF NEW.is_public = true THEN
    INSERT INTO public.public_profiles (id, full_name, avatar_url, created_at)
    SELECT p.id, p.full_name, p.avatar_url, p.created_at
    FROM public.profiles p
    WHERE p.id = NEW.user_id
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_share_change ON public.shares;
CREATE TRIGGER on_share_change
  AFTER INSERT OR UPDATE ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_profile_on_share();